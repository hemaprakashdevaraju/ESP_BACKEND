
require("dotenv").config();

const express = require("express");
const twilio = require("twilio");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10kb" }));

// Log incoming requests without exposing credentials.
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Check required Render environment variables.
const requiredEnv = [
  "DEVICE_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "EMERGENCY_TO_NUMBER",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.get("/", (req, res) => {
  res.status(200).send("Accident Alert Server is running.");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/accident", async (req, res) => {
  if (req.get("X-Device-Key") !== process.env.DEVICE_KEY) {
    console.warn("Rejected accident request: invalid device key");
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.body?.event !== "possible_accident") {
    return res.status(400).json({ error: "Invalid event" });
  }

  const lat = req.body.latitude;
  const lon = req.body.longitude;

  const validCoordinates =
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;

  let locationText = "GPS location unavailable.";

  if (validCoordinates) {
    const mapsUrl =
      `https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`;

    locationText =
      `Latitude: ${lat.toFixed(6)}\n` +
      `Longitude: ${lon.toFixed(6)}\n` +
      `Map: ${mapsUrl}`;
  }

  const message =
    "EMERGENCY: Possible vehicle accident detected. " +
    "Please check on the driver.\n" +
    locationText;

  console.log("Authenticated accident alert received.");
  console.log("Valid GPS coordinates:", validCoordinates);

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to: process.env.EMERGENCY_TO_NUMBER,
    });

    console.log("Twilio accepted SMS request. SID:", result.sid);
    console.log("Initial Twilio status:", result.status);

    return res.status(200).json({
      sent: true,
      messageSid: result.sid,
      status: result.status,
    });
  } catch (error) {
    console.error("Twilio SMS request failed:", error.message);

    if (error.code) {
      console.error("Twilio error code:", error.code);
    }

    return res.status(502).json({ error: "SMS sending failed" });
  }
});

// Handle invalid JSON requests.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  console.error("Server error:", err.message);
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Accident alert server is running on port ${PORT}`);
});
