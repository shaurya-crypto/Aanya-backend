import mongoose from "mongoose";

const connectDB = async () => {
  const ok = await mongoose.connect(process.env.MONGO_URI);
  if (ok) {
    console.log("MongoDB connected")
  }
};

export default connectDB;
