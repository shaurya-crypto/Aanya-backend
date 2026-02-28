// import mongoose from "mongoose";

// const logSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   key: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey' }, // Optional: which key was used
//   endpoint: { type: String, required: true },
//   method: { type: String, required: true }, // GET, POST
//   status: { type: Number, required: true }, // 200, 400, 500
//   latency: { type: Number, required: true }, // In milliseconds
//   createdAt: { type: Date, default: Date.now },
//   ip: { type: String },

//   device_id: { type: String }
// });

// logSchema.index({ user: 1, createdAt: -1 });

// export default mongoose.models.Log || mongoose.model("Log", logSchema);
import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  status: { type: Number, required: true },
  latency: { type: Number, required: true },

  // ✅ Snapshot of account usage at time of request
  globalRequestCount: { type: Number, default: 0 },

  // Optional analytics data
  plan: { type: String },
  device_id: { type: String, default: "unknown" },
  ip: { type: String },

  createdAt: { type: Date, default: Date.now }
});

// For dashboard + burst detection
logSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Log || mongoose.model("Log", logSchema);
