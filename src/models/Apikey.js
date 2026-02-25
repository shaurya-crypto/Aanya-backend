import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  userId: mongoose.Schema.Types.ObjectId,
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  lastRequestDate: { type: String, default: null },
  createdIp: { type: String }
});

// Prevent OverwriteModelError
export default mongoose.models.ApiKey || mongoose.model("ApiKey", apiKeySchema);
