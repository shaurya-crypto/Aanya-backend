import User from "../models/user.js";
import ApiKey from "../models/Apikey.js";
import Log from "../models/Log.js";
import { formatIST } from "../utils/time.js";

export const getDashboardData = async (req, res) => {
    try {
        const userId = req.userId;

        // 1️⃣ Get FULL User Data (exclude password only)
        const user = await User.findById(userId).select("-passwordHash");
        if (!user) return res.status(404).json({ error: "User not found" });

        // 2️⃣ Fetch ALL API Keys (no changes)
        const apiKeys = await ApiKey.find({ userId }).sort({ createdAt: -1 });

        const accountLimit = user.limit || 40; // Use the actual DB limit!
        const currentUsage = user.globalRequestCount || 0;

        // 4️⃣ Fetch ALL Logs (No limit now)
        const rawLogs = await Log.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();

        const logs = rawLogs.map(log => ({
            ...log,
            createdAt: log.createdAt,
            createdAt_IST: formatIST(log.createdAt)
        }));

        // 5️⃣ Send EVERYTHING
        res.json({
            user: user,  // Sends full user document (except password)
            usage: {

                current: currentUsage,
                limit: accountLimit
            },
            apiKeys: apiKeys,
            logs: logs
        });

    } catch (err) {
        console.error("Dashboard API Error:", err);
        res.status(500).json({ error: "Server Error" });
    }
};

export default getDashboardData;
