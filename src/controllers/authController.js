import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

// --- REGISTER (Auto-Login & Long Session) ---
export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create User (Default Free Plan)
    const user = await User.create({ 
        email, 
        passwordHash,
        plan: "free" 
    });

    // GENERATE TOKEN IMMEDIATELY (Auto-Login)
    // Set expiry to 30 days for long-term session
    const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "30d" } 
    );

    // Return token so frontend can log them in instantly
    res.json({ success: true, token, plan: user.plan });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Registration failed" });
  }
};

// --- LOGIN (Long Session) ---
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    // Set expiry to 30 days
    const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );

    res.json({ token, plan: user.plan });
  } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Login failed" });
  }
};