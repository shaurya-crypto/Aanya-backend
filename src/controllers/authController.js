import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import User from "../models/user.js";
import ApiKey from "../models/Apikey.js";

export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });

    // Generate Key
    const key = `aanya_${uuidv4().replace(/-/g, "")}`;
    await ApiKey.create({ key, userId: user._id });

    res.json({ success: true, apiKey: key });
  } catch (e) {
    res.status(500).json({ error: "Registration failed" });
  }
};

// export const login = async (req, res) => {
//   const { email, password } = req.body;

//   const user = await User.findOne({ email });
//   const ok = await bcrypt.compare(password, user.passwordHash);

//   if (!ok) return res.status(401).end();

//   const token = jwt.sign(
//     { userId: user._id },
//     process.env.JWT_SECRET
//   );

//   res.json({ token });
// };

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