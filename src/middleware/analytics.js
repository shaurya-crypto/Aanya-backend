import Log from "../models/Log.js";

const trackAnalytics = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", async () => {
    try {
      if (!req.userId || !req.user) {
        console.log("Analytics skipped: No authenticated user");
        return;
      }

      const latency = Date.now() - startTime;

      await Log.create({
        user: req.userId,
        endpoint: req.originalUrl,
        method: req.method,
        status: res.statusCode,
        latency: latency,

        // ✅ Snapshot of account usage
        globalRequestCount: req.user.globalRequestCount || 0,
        plan: req.user.plan || "free",

        ip: req.ip,
        device_id: req.body?.deviceId || "unknown"
      });

      console.log("Account log saved");

    } catch (error) {
      console.error("Analytics Error:", error);
    }
  });

  next();
};

export default trackAnalytics;
