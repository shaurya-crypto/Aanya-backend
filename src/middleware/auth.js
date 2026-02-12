import ApiKey from "../models/ApiKey.js";

export const apiAuth = async (req, res, next) => {
  try {
    const key = req.headers["x-api-key"];

    if (!key) {
      return res.status(401).json({ error: "API key missing" });
    }

    const record = await ApiKey.findOne({ key, active: true });

    if (!record) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    // Attach BOTH user and key
    req.userId = record.userId;
    req.apiKey = record;

    next();

  } catch (err) {
    console.error("Auth Error:", err);
    return res.status(500).json({ error: "Auth failed" });
  }
};

export default apiAuth;
