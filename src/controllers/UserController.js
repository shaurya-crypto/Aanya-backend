import User from "../models/user.js";
import ApiKey from "../models/Apikey.js";

export const getDashboardData = async (req, res) => {
    try {
        const userId = req.userId;


        const user = await User.findById(userId).select("-passwordHash");
        if (!user) return res.status(404).json({ error: "User not found" });


        const apiKeys = await ApiKey.find({ userId: userId }).sort({ createdAt: -1 });

        const totalUsage = apiKeys.reduce((acc, key) => acc + key.requestCount, 0);

        // 4. Define Plan Limits
        const PLAN_LIMITS = {
            free: 50,
            pro: 200,       // Logic for Pro Plan
            developer: 500,
            custom: 800
        };

        const userPlan = user.plan ? user.plan.toLowerCase() : 'free';
        
        // If plan exists in our list, use it; otherwise default to free limit
        const limit = PLAN_LIMITS[userPlan] || PLAN_LIMITS['free'];

        res.json({
            user: {
                name: user.email.split('@')[0],
                email: user.email,
                plan: userPlan // Sending back the normalized plan name
            },
            usage: {
                current: totalUsage,
                limit: limit
            },
            apiKeys: apiKeys
        });

    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).json({ error: "Server Error" });
    }
};

export default getDashboardData;
