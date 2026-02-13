import ApiKey from "../models/ApiKey.js";
import Log from "../models/Log.js";

const PLAN_LIMITS = {
  free: 50,
  pro: 200,
  developer: 500,
  custom: 800
};

export const rateLimit = async (req, res, next) => {
  const today = new Date().toISOString().split("T")[0];
  const now = Date.now();

  try {
    const record = await ApiKey.findOne({ key: req.headers["x-api-key"] })
      .populate("userId");

    if (!record) return res.status(403).json({ error: "Invalid API Key" });

    const user = record.userId;

    // 🔴 Permanent Ban
    if (user.isBanned)
      return res.status(403).json({ error: "Account permanently banned" });

    // 🔴 Temporary Ban
    if (user.tempBanUntil && user.tempBanUntil > new Date())
      return res.status(429).json({
        error: "Temporarily banned",
        until: user.tempBanUntil
      });

    // 🔄 Daily Reset
    if (!record.lastRequestDate || record.lastRequestDate !== today) {
      record.requestCount = 0;
      record.lastRequestDate = today;
    }

    const dailyLimit =
      PLAN_LIMITS[user.plan?.toLowerCase()] || PLAN_LIMITS.free;

    if (record.requestCount >= dailyLimit) {
      user.warningCount += 1;

      if (user.warningCount >= 3) {
        user.tempBanUntil = new Date(now + 60 * 60 * 1000);
        user.tempBanCount += 1;
      }

      // 🔥 Auto permanent ban after 5 temp bans
      if (user.tempBanCount >= 5) {
        user.isBanned = true;
      }

      await user.save();

      return res.status(429).json({ error: "Daily limit exceeded" });
    }

    // 🔥 Rate Burst Detection (30 requests / 1 min)
    const oneMinuteAgo = new Date(now - 60 * 1000);

    const recentRequests = await Log.countDocuments({
      user: user._id,
      createdAt: { $gte: oneMinuteAgo }
    });

    if (recentRequests >= 30) {
      user.tempBanUntil = new Date(now + 60 * 60 * 1000);
      user.tempBanCount += 1;
      await user.save();

      return res.status(429).json({
        error: "Rate burst detected. Temporary ban applied."
      });
    }

    record.requestCount += 1;
    await record.save();

    next();

  } catch (err) {
    console.error("RateLimit Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

export default rateLimit;
//