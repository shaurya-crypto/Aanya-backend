import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import User from "../models/user.js";
import ApiKey from "../models/Apikey.js";

// --- REGISTER CONTROLLER (New Code with Plans) ---
export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create User with Default 'free' plan
    const user = await User.create({ 
        email, 
        passwordHash,
        plan: "free" 
    });

    // Generate Key
    const key = `aanya_${uuidv4().replace(/-/g, "")}`;
    const newApiKey = await ApiKey.create({ key, userId: user._id });

    // Link key to user
    user.apiKeys.push(newApiKey._id);
    await user.save();

    res.json({ success: true, apiKey: key, plan: user.plan });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Registration failed" });
  }
};

// --- LOGIN CONTROLLER (Keep this existing code) ---
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
  );

  res.json({ token });
};
