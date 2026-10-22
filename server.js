
const express = require("express");
const twilio = require("twilio");

const app = express();
app.use(express.json({ limit: "20kb" }));

const PORT = process.env.PORT || 3000;

const DEVICE_KEY = process.env.DEVICE_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const EMERGENCY_TO_NUMBER = process.env.EMERGENCY_TO_NUMBER;

const requiredVariables = {
  DEVICE_KEY,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER,
  EMERGENCY_TO_NUMBER,
};

const missingVariables = Object.entries(requiredVariables)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingVariables.length > 0) {
  console.error(
    "Missing required environment variables:",
    missingVariables.join(", ")
  );
}

const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

// Request logging
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.path}`
  );
  next();
});

// Basic health checks
app.get("/", (req, res) => {
  res.status(200).send("Smart Vehicle Accident Alert Backend is running.");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Accident alert endpoint
app.post("/accident", async (req, res) => {
  try {
    // Authenticate the ESP32
    const suppliedKey = req.get("X-Device-Key");

    if (!DEVICE_KEY || !suppliedKey || suppliedKey !== DEVICE_KEY) {
      console.warn("Rejected request: invalid device key.");
      return res.status(401).json({ error: "Unauthorized device" });
    }

    console.log("Authenticated accident alert received.");

    const {
      event = "possible_accident",
      latitude,
      longitude,
      mapsUrl,
    } = req.body || {};

    if (event !== "possible_accident") {
      return res.status(400).json({ error: "Unsupported event" });
    }

    // Convert valid numeric coordinates, but reject null/empty values.
    const lat =
      latitude !== null && latitude !== undefined && latitude !== ""
        ? Number(latitude)
        : NaN;

    const lon =
      longitude !== null && longitude !== undefined && longitude !== ""
        ? Number(longitude)
        : NaN;

    const validGps =
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180;

    console.log("Valid GPS coordinates:", validGps);

    if (!twilioClient) {
      console.error("Twilio is not configured.");
      return res.status(500).json({
        error: "SMS service is not configured",
      });
    }

    // Build the message on the server; never trust a client-provided URL.
    let smsMessage = "VEHICLE ACCIDENT ALERT: Possible accident detected.";

    if (validGps) {
      const locationUrl =
        `https://www.google.com/maps?q=${lat},${lon}`;

      smsMessage +=
        ` Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}.` +
        ` Map: ${locationUrl}`;
    } else {
      smsMessage +=
        " GPS location is not available yet.";
    }

    // IMPORTANT:
    // This is a standard custom SMS body. Twilio trial accounts may reject
    // it with error 572006. A template name placed in "body" does not
    // invoke a predefined template.
    const message = await twilioClient.messages.create({
    body: "sms_account_alerts",
    from: TWILIO_FROM_NUMBER,
    to: EMERGENCY_TO_NUMBER
    });

    console.log("Twilio accepted SMS. Message SID:", message.sid);
    console.log("Twilio message status:", message.status);

    return res.status(200).json({
      status: "accepted",
      messageSid: message.sid,
      smsStatus: message.status,
      gpsAvailable: validGps,
    });
  } catch (error) {
    console.error("Accident alert processing failed:", error.message);

    if (error.code) {
      console.error("Twilio/server error code:", error.code);
    }

    if (error.status) {
      console.error("Error HTTP status:", error.status);
    }

    if (error.code === 572006) {
      return res.status(502).json({
        error: "Twilio trial does not accept this custom SMS body",
        code: 572006,
        guidance:
          "Use a supported predefined trial message or upgrade the Twilio account for custom SMS.",
      });
    }

    return res.status(502).json({
      error: "SMS sending failed",
      code: error.code || null,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
