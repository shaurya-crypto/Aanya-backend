import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Index the email for super-fast lookups when Aanya needs to remember
chatSchema.index({ email: 1, createdAt: -1 });

export default mongoose.models.Chat || mongoose.model("Chat", chatSchema);