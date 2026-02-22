import ApiKey from "../models/Apikey.js";

export const apiAuth = async (req, res, next) => {
  try {
    const key = req.headers["x-api-key"];
    if (!key) return res.status(401).json({ error: "API key missing" });

    const record = await ApiKey.findOne({ key, active: true }).populate("userId");
    if (!record) return res.status(403).json({ error: "Invalid API key" });

    req.userId = record.userId._id;
    req.apiKey = record;

    // Capture client IP
    req.clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    next();

  } catch (err) {
    console.error("Auth Error:", err);
    return res.status(500).json({ error: "Auth failed" });
  }
};

export default apiAuth;
