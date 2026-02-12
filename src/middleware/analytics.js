const Log = require('../models/Log');
const User = require('../models/User');

const trackAnalytics = async (req, res, next) => {
  const start = Date.now();

  // Wait for the response to finish sending to the user
  res.on('finish', async () => {
    try {
      if (!req.user) return; // Don't track if not authenticated

      const duration = Date.now() - start;
      
      // 1. Create the Log Entry
      await Log.create({
        user: req.user.userId,
        method: req.method,
        endpoint: req.originalUrl,
        status: res.statusCode,
        latency: duration,
        device_id: req.body.deviceId || 'unknown'
      });

      // 2. Increment Usage Counter (Only for successful API calls)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await User.findByIdAndUpdate(req.user.userId, { 
          $inc: { 'usage.current': 1 } 
        });
      }

    } catch (error) {
      console.error("Analytics Error:", error);
    }
  });

  next();
};

module.exports = trackAnalytics;
