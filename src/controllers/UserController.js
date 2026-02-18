import User from "../models/user.js";
import ApiKey from "../models/Apikey.js";
import Log from "../models/Log.js"; 
import { formatIST } from "../utils/time.js"; // ✅ Import helper

export const getDashboardData = async (req, res) => {
    try {
        const userId = req.userId; 

        // 1. Fetch User details (exclude password)
        const user = await User.findById(userId).select("-passwordHash");
        if (!user) return res.status(404).json({ error: "User not found" });

        // 2. Fetch ALL API Keys
        const apiKeys = await ApiKey.find({ userId: userId }).sort({ createdAt: -1 });

        // 3. Calculate Total Usage
        const totalUsage = apiKeys.reduce((acc, key) => acc + (key.requestCount || 0), 0);

        // 4. Determine Plan Limits
        const limits = { free: 50, pro: 200, developer: 500, custom: 800 };
        const limit = limits[user.plan] || 50;

        // 5. ✅ FETCH LOGS WITH IST FORMAT
        const rawLogs = await Log.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean(); // .lean() allows us to modify the JSON object

        // Add the 'createdAt_IST' field to each log
        const logs = rawLogs.map(log => ({
            ...log,
            createdAt: log.createdAt,       // Keep original for charts
            createdAt_IST: formatIST(log.createdAt) // ✅ Add readable IST string
        }));

        // 6. Send Response
        res.json({
            user: {
                name: user.name,
                email: user.email,
                plan: user.plan
            },
            usage: {
                current: totalUsage,
                limit: limit
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