import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: "Invalid email format"
    }
  },
  passwordHash: { type: String, required: true },

  plan: {
    type: String,
    enum: ["free", "pro", "developer", "custom"],
    default: "free"
  },

  apiKeys: [{ type: mongoose.Schema.Types.ObjectId, ref: "ApiKey" }],

  createdAt: { type: Date, default: Date.now },

  // 🔒 Security Fields
  isBanned: { type: Boolean, default: false },
  tempBanUntil: { type: Date, default: null },
  tempBanCount: { type: Number, default: 0 },
  warningCount: { type: Number, default: 0 },
  registeredIp: { type: String },   // track account creation IP

  systemKeyUsage: { type: Number, default: 0 }
});

export default mongoose.models.User || mongoose.model("User", userSchema);
