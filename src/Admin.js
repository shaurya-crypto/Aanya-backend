import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Models
import User from "./models/user.js";
import ApiKey from "./models/Apikey.js";

// Config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to DB");

    const email = "admin@aanya.ai"; // <--- YOUR LOGIN EMAIL
    const password = "password123";   // <--- YOUR LOGIN PASSWORD

    // 1. Create User
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, plan: "pro" });
    
    // 2. Generate API Key
    const key = `aanya_${uuidv4().replace(/-/g, "")}`;
    await ApiKey.create({ key, userId: user._id });

    console.log("\n🎉 User Created Successfully!");
    console.log("------------------------------------------------");
    console.log(`📧 Email:    ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🗝️ API Key:  ${key}`);
    console.log("------------------------------------------------");
    console.log("👉 Copy this API Key and paste it into the Login UI.");

    process.exit();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

createAdmin();