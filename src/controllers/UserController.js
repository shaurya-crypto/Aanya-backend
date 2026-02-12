import User from "../models/user.js";
import ApiKey from "../models/ApiKey.js";
import Log from "../models/Log.js"; // ✅ ADD THIS

export const getDashboardData = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await User.findById(userId).select("-passwordHash");
        if (!user) return res.status(404).json({ error: "User not found" });

        // Fetch ALL API Keys for this user
        const apiKeys = await ApiKey.find({ userId: userId }).sort({ createdAt: -1 });

        // Calculate Total Usage (keep your logic intact)
        const totalUsage = apiKeys.reduce((acc, key) => acc + key.requestCount, 0);

        const limits = { free: 50, pro: 200, developer: 500, custom: 800 };
        const limit = limits[user.plan] || 50;

        // ✅ NEW — Fetch latest 100 logs (safe limit)
        const logs = await Log.find({ user: userId })
            .sort({ timestamp: -1 })
            .limit(100);

        res.json({
            user: {
                name: user.email.split('@')[0],
                email: user.email,
                plan: user.plan
            },
            usage: {
                current: totalUsage,
                limit: limit
            },
            apiKeys: apiKeys,
            logs: logs   // ✅ JUST ADDED THIS (does not break anything)
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
};

export default getDashboardData;
