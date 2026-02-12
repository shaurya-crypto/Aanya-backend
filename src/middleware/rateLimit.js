import ApiKey from "../models/Apikey.js";

// 1. DEFINE YOUR LIMITS HERE
const PLAN_LIMITS = {
  free: 40,         // 50 requests/day
  pro: 100,         // 500 requests/day
  developer: 500,  // 5000 requests/day
  custom: 800    // High limit
};

export const rateLimit = async (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!key) return res.status(401).json({ error: "No API Key provided" });

  const today = new Date().toISOString().split('T')[0];

  try {
    // 2. POPULATE THE USER
    // We need to fetch the 'userId' field to see the 'plan'
    const record = await ApiKey.findOne({ key }).populate("userId");

    if (!record) return res.status(403).json({ error: "Invalid API Key" });
    if (!record.active) return res.status(403).json({ error: "API Key is disabled" });

    // 3. DETERMINE LIMIT BASED ON PLAN
    // If user is missing or plan is invalid, default to 0 (strict) or 'free' limits
    const userPlan = record.userId ? record.userId.plan : "free";
    const dailyLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS["free"];

    // 4. RESET COUNTER IF NEW DAY
    if (record.lastRequestDate !== today) {
      record.requestCount = 0;
      record.lastRequestDate = today;
    }

    // 5. CHECK LIMIT
    if (record.requestCount >= dailyLimit) {
      return res.status(429).json({ 
        error: `Daily limit exceeded for ${userPlan} plan (${dailyLimit}/day).`,
        currentUsage: record.requestCount,
        upgradeUrl: "/pricing" 
      });
    }

    // 6. INCREMENT AND SAVE
    record.requestCount += 1;
    await record.save();

    // Attach user info to request for the next controller to use
    req.user = record.userId; 
    
    next();
  } catch (err) {
    console.error("Rate Limit Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};