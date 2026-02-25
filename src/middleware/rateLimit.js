import ApiKey from "../models/Apikey.js";
import Log from "../models/Log.js";
import User from "../models/user.js"; // 👈 ADD THIS IMPORT
import { getTodayIST } from "../utils/time.js";

const PLAN_LIMITS = {
  free: 40,
  pro: 100,
  developer: 500,
  custom: 800
};

export const rateLimit = async (req, res, next) => {
  const today = getTodayIST();
  const now = Date.now();

  try {
    const record = await ApiKey.findOne({ key: req.headers["x-api-key"] });

    if (!record) return res.status(403).json({ error: "Invalid API Key" });

    const user = await User.findById(record.userId);

    if (!user) return res.status(404).json({ error: "User not found" });


    if (user.isBanned)
      return res.status(403).json({ error: "Account permanently banned" });

    // 🔴 Temporary Ban Check
    if (user.tempBanUntil && user.tempBanUntil > new Date())
      return res.status(429).json({
        error: "Temporarily banned",
        until: user.tempBanUntil
      });

    // 🔄 GLOBAL Daily Reset
    if (!user.lastRequestDate || user.lastRequestDate !== today) {
      console.log(`Resetting GLOBAL limit for user ${user.email} (New Date: ${today})`);
      user.globalRequestCount = 0;
      user.lastRequestDate = today;
      await user.save(); // This will work now
    }

    // Determine Limit
    const dailyLimit = PLAN_LIMITS[user.plan?.toLowerCase()] || PLAN_LIMITS.free;

    // ⚠️ CHECK LIMIT
    if ((user.globalRequestCount || 0) >= user.limit) {
      user.warningCount += 1;

      if (user.warningCount >= 3) {
        user.tempBanUntil = new Date(now + 60 * 60 * 1000);
        user.tempBanCount += 1;
      }

      if (user.tempBanCount >= 5) {
        user.isBanned = true;
      }

      await user.save();

      return res.status(429).json({
        error: "Daily account limit exceeded. Upgrade for more requests.",
        resetTime: "00:00 IST"
      });
    }

    const oneMinuteAgo = new Date(now - 60 * 1000);

    // Wrap logging in try-catch so it doesn't crash the main app if Logs fail
    try {
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
    } catch (logErr) {
        console.warn("Log check failed, skipping burst check.");
    }

    // ✅ Increment Counts
    user.globalRequestCount = (user.globalRequestCount || 0) + 1;
    await user.save(); // User Save
    record.lastRequestDate = today;
    await record.save(); // ApiKey Save

    // Attach to request
    req.apiKey = record;
    req.user = user;
    req.userId = user._id;

    next();

  } catch (err) {
    console.error("RateLimit Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

export default rateLimit;