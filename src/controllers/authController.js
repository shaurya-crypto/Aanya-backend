import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const register = async (req, res) => {
  try {
    const {name, email, password } = req.body;

    if (!email || !password || !name)
      return res.status(400).json({ error: "Email and password are required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "User already exists" });

    // 🌍 Capture IP
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const accountsFromIp = await User.countDocuments({ registeredIp: clientIp });

    if (accountsFromIp >= 3) {
      return res.status(403).json({
        error: "Too many accounts created from this IP."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      plan: "free",
      registeredIp: clientIp
    });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ success: true, token, plan: user.plan });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Registration failed" });
  }
};


export const login = async (req, res) => {
  try {
    const {name, email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res.status(401).json({ error: "Invalid email or password" });

    if (user.isBanned) {
      return res.status(403).json({
        error: "Your account has been permanently banned."
      });
    }

    if (user.tempBanUntil && user.tempBanUntil > new Date()) {
      return res.status(403).json({
        error: "Your account is temporarily banned.",
        until: user.tempBanUntil
      });
    }

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
