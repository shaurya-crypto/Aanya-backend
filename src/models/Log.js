import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey' }, // Optional: which key was used
  endpoint: { type: String, required: true },
  method: { type: String, required: true }, // GET, POST
  status: { type: Number, required: true }, // 200, 400, 500
  latency: { type: Number, required: true }, // In milliseconds
  createdAt: { type: Date, default: Date.now },
  ip: { type: String },

  device_id: { type: String }
});

logSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Log || mongoose.model("Log", logSchema);