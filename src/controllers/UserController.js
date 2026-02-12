import User from "../models/user.js";
import ApiKey from "../models/Apikey.js";

export const getDashboardData = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await User.findById(userId).select("-passwordHash");
        if (!user) return res.status(404).json({ error: "User not found" });

        // Fetch ALL API Keys for this user
        const apiKeys = await ApiKey.find({ userId: userId }).sort({ createdAt: -1 });

        // Calculate Total Usage
        const totalUsage = apiKeys.reduce((acc, key) => acc + key.requestCount, 0);

        const limits = { free: 50, pro: 200, developer: 500, custom: 800 };
        const limit = limits[user.plan] || 50;

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
            // Send full array of keys
            apiKeys: apiKeys
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
};

export default getDashboardData;