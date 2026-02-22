import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String },
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
  passwordHash: { type: String },

  googleId: { type: String, unique: true, sparse: true },

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
  registeredIp: { type: String },
  globalRequestCount: { type: Number, default: 0 },
  lastRequestDate: { type: String, default: null },
  systemKeyUsage: { type: Number, default: 0 },
  limit: { default: 40, type: Number },

  isOnboarded: { type: Boolean, default: false },
  profile: {
    country: { type: String },
    city: { type: String },
    language: { type: String },
    timezone: { type: String },
    profession: { type: String },
    primaryGoal: { type: String },
    expLevel: { type: String },
    tone: { type: String },
    referral: { type: String },
    interests: [{ type: String }],
    aiHelp: { type: String },
    bio: { type: String },
  },
  isTwoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String },
  sessions: [{
    sessionId: String,
    device: String,
    ip: String,
    createdAt: { type: Date, default: Date.now }
  }]

});
// ✅ Removed 'next' from parameters and body. Added 'async'.
userSchema.pre('save', async function () {
  if (this.isModified('plan') || this.isNew || this.limit == null) {
    const PLAN_LIMITS = {
      free: 40,
      pro: 100,
      developer: 500,
      custom: 800
    };

    // Set the limit based on the plan, default to 40 if not found
    this.limit = PLAN_LIMITS[this.plan] || 40;
  }
});

export default mongoose.models.User || mongoose.model("User", userSchema);