import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String, required: true, unique: true, lowercase: true, validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  passwordHash: { type: String, required: true },
  plan: {
    type: String,
    enum: ["free", "pro", "developer", "custom"],
    default: "free"
  },
  // Optional: You can store key references here if you want to list them in the UI
  apiKeys: [{ type: mongoose.Schema.Types.ObjectId, ref: "ApiKey" }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);
