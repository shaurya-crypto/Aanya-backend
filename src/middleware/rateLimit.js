import ApiKey from "../models/ApiKey.js";

const PLAN_LIMITS = {
  free: 50,
  pro: 200,
  developer: 500,
  custom: 800
};

export const rateLimit = async (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!key) return res.status(401).json({ error: "No API Key provided" });

  const today = new Date().toISOString().split('T')[0];

  try {
    // Populate userId to get the user's plan
    const record = await ApiKey.findOne({ key }).populate("userId");

    if (!record) return res.status(403).json({ error: "Invalid API Key" });
    if (!record.active) return res.status(403).json({ error: "API Key is disabled" });

    const userPlan = record.userId?.plan?.toLowerCase() || "free";
    const dailyLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS["free"];

    // Reset if it's a new day
    if (record.lastRequestDate !== today) {
      record.requestCount = 0;
      record.lastRequestDate = today;
    }

    // CHECK LIMIT
    if (record.requestCount >= dailyLimit) {
      return res.status(429).json({
        error: `Daily limit exceeded (${dailyLimit}/day).`,
        currentUsage: record.requestCount
      });
    }


    record.requestCount += 1;
    await record.save();
    console.log("RateLimit triggered");


    req.userId = record.userId._id; // Attach for analytics middleware
    next();
  } catch (err) {
    console.error("Rate Limit Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};