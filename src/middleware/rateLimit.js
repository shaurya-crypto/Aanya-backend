import ApiKey from "../models/Apikey.js";

export const rateLimit = async (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!key) return res.status(401).json({ error: "No API Key provided" });

  // Get today's date (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];

  try {
    const record = await ApiKey.findOne({ key });

    if (!record) return res.status(403).json({ error: "Invalid API Key" });

    // 1. RESET if it's a new day
    if (record.lastRequestDate !== today) {
      record.requestCount = 0;
      record.lastRequestDate = today;
    }

    // 2. CHECK LIMIT (40 Requests)
    if (record.requestCount >= 40) {
      return res.status(429).json({ 
        error: "Daily limit exceeded (40/day). Please upgrade.",
        retryAfter: "Tomorrow"
      });
    }

    // 3. COUNT & CONTINUE
    record.requestCount += 1;
    await record.save();

    next();
  } catch (err) {
    console.error("Rate Limit Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};