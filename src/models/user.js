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
  plan: { 
      type: String, 
      enum: ['free', 'pro', 'enterprise'], 
      default: 'free' 
    },
    usage: {
      current: { type: Number, default: 0 },
      limit: { type: Number, default: 50 } // Free tier limit
    },
    // ------------------------
  
    apiKeys: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey' }],
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);

