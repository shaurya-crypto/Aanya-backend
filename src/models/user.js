import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, validate: {
    validator: function(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    },
    message: 'Invalid email format'
  }},
  passwordHash: { type: String, required: true },
  plan: { type: String, default: "free" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);
