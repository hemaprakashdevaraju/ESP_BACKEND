
require("dotenv").config();

const express = require("express");
const twilio = require("twilio");

const app = express();
app.use(express.json({ limit: "10kb" }));

// Health check for verifying deployment without sending an SMS.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});


const required = [
  "DEVICE_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "EMERGENCY_TO_NUMBER"
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.post("/accident", async (req, res) => {
  // Authenticate the device request.
  if (req.get("X-Device-Key") !== process.env.DEVICE_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.body?.event !== "possible_accident") {
    return res.status(400).json({ error: "Invalid event" });
  }

  const lat = req.body.latitude;
  const lon = req.body.longitude;

  let locationText = "GPS location unavailable.";

  if (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180
  ) {
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

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to: process.env.EMERGENCY_TO_NUMBER
    });

    console.log("Twilio message SID:", result.sid);
    return res.status(200).json({
      sent: true,
      messageSid: result.sid
    });
  } catch (error) {
    console.error("Twilio error:", error.message);
    return res.status(502).json({ error: "SMS sending failed" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Accident alert server is running on port ${PORT}`);
});
