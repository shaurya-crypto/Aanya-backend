import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  userId: mongoose.Schema.Types.ObjectId,
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },

  // --- RATE LIMITING FIELDS ---
  requestCount: { type: Number, default: 0 },
  lastRequestDate: { type: String, default: null } // Stores "YYYY-MM-DD" 1
});

export default mongoose.model("ApiKey", apiKeySchema);

