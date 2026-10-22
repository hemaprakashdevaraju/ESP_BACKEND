
require("dotenv").config();

const express = require("express");
const twilio = require("twilio");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Parse JSON requests
app.use(express.json({ limit: "10kb" }));

// Log incoming requests without logging secrets or message contents
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.path}`
  );
  next();
});

// Validate required environment variables
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

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Basic server health check
app.get("/", (req, res) => {
  res.status(200).send("Accident Alert Server is running.");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Accident alert endpoint
app.post("/accident", async (req, res) => {
  // Authenticate the ESP32
  if (req.get("X-Device-Key") !== process.env.DEVICE_KEY) {
    console.warn("Rejected /accident request: invalid device key");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Validate event type
  if (req.body?.event !== "possible_accident") {
    return res.status(400).json({ error: "Invalid event" });
  }

  const latitude = req.body.latitude;
  const longitude = req.body.longitude;

  let locationText = "GPS location unavailable.";

  const validCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (validCoordinates) {
    const mapsUrl =
      `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

    locationText =
      `Latitude: ${latitude.toFixed(6)}\n` +
      `Longitude: ${longitude.toFixed(6)}\n` +
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

    console.log("Twilio accepted SMS request. Message SID:", result.sid);
    console.log("Twilio initial message status:", result.status);

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

    return res.status(502).json({
      error: "SMS sending failed",
    });
  }
});

// Handle malformed JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  console.error("Server error:", err.message);
  return res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Accident alert server is running on port ${PORT}`);
});

require("dotenv").config();

const express = require("express");
const twilio = require("twilio");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Parse JSON requests
app.use(express.json({ limit: "10kb" }));

// Log incoming requests without logging secrets or message contents
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.path}`
  );
  next();
});

// Validate required environment variables
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

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Basic server health check
app.get("/", (req, res) => {
  res.status(200).send("Accident Alert Server is running.");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Accident alert endpoint
app.post("/accident", async (req, res) => {
  // Authenticate the ESP32
  if (req.get("X-Device-Key") !== process.env.DEVICE_KEY) {
    console.warn("Rejected /accident request: invalid device key");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Validate event type
  if (req.body?.event !== "possible_accident") {
    return res.status(400).json({ error: "Invalid event" });
  }

  const latitude = req.body.latitude;
  const longitude = req.body.longitude;

  let locationText = "GPS location unavailable.";

  const validCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (validCoordinates) {
    const mapsUrl =
      `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

    locationText =
      `Latitude: ${latitude.toFixed(6)}\n` +
      `Longitude: ${longitude.toFixed(6)}\n` +
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

    console.log("Twilio accepted SMS request. Message SID:", result.sid);
    console.log("Twilio initial message status:", result.status);

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

    return res.status(502).json({
      error: "SMS sending failed",
    });
  }
});

// Handle malformed JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  console.error("Server error:", err.message);
  return res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Accident alert server is running on port ${PORT}`);
});
