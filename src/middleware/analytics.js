import Log from '../models/Log.js';

const trackAnalytics = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', async () => {
    try {
      if (!req.userId) {
        console.log("Analytics skipped: No userId");
        return;
      }

      const latency = Date.now() - startTime;

      await Log.create({
        user: req.userId,
        key: req.apiKey?._id || null,
        method: req.method,
        endpoint: req.originalUrl,
        status: res.statusCode,
        latency: latency,
        device_id: req.body?.deviceId || 'unknown'
      });

      console.log("Log saved");

    } catch (error) {
      console.error("Analytics Error:", error);
    }
  });

  next();
};

export default trackAnalytics;
