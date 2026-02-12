import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey' }, // Optional: which key was used
  endpoint: { type: String, required: true },
  method: { type: String, required: true }, // GET, POST
  status: { type: Number, required: true }, // 200, 400, 500
  latency: { type: Number, required: true }, // In milliseconds
  timestamp: { type: Date, default: Date.now },
  device_id: { type: String }
});

// Index for faster querying by date
logSchema.index({ user: 1, timestamp: -1 });

const Log = mongoose.model("Log", logSchema);
export default Log;