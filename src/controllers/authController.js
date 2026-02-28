import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import ApiKey from "../models/Apikey.js";
import Log from "../models/Log.js";

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


import crypto from "crypto"; // Add this to the top of authController.js if not there

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    if (user.isBanned) {
      return res.status(403).json({ error: "Your account has been permanently banned." });
    }

    if (user.tempBanUntil && user.tempBanUntil > new Date()) {
      return res.status(403).json({ error: "Your account is temporarily banned.", until: user.tempBanUntil });
    }

    // 🚀 THE ENFORCEMENT CHECK: If 2FA is on, stop here and ask for the PIN!
    if (user.isTwoFactorEnabled) {
      return res.json({ require2FA: true, email: user.email });
    }

    // --- NON-2FA USERS: Proceed to create session instantly ---
    const sessionId = crypto.randomBytes(16).toString("hex");
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"] || "Unknown Device";
    
    let deviceName = "Unknown Device";
    if (userAgent.includes("Windows")) deviceName = "Windows PC";
    else if (userAgent.includes("Mac")) deviceName = "Mac";
    else if (userAgent.includes("Linux")) deviceName = "Linux PC";
    else if (userAgent.includes("Android")) deviceName = "Android Device";
    else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) deviceName = "iOS Device";

    user.sessions.push({ sessionId, device: deviceName, ip: clientIp, createdAt: new Date() });
    if (user.sessions.length > 5) user.sessions.shift(); 
    await user.save();

    const token = jwt.sign(
      { userId: user._id, sessionId: sessionId }, 
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ token, plan: user.plan });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
};

// 🚀 NEW FUNCTION: Verify the PIN during login
export const verifyLogin2FA = async (req, res) => {
  try {
    const { email, token: twoFactorPin } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "User not found" });

    // Check the PIN
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: twoFactorPin,
      window: 2
    });

    if (!isValid) return res.status(400).json({ error: "Invalid 2FA PIN" });

    // --- PIN IS CORRECT: Now we create the session and let them in ---
    const sessionId = crypto.randomBytes(16).toString("hex");
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"] || "Unknown Device";
    
    let deviceName = "Unknown Device";
    if (userAgent.includes("Windows")) deviceName = "Windows PC";
    else if (userAgent.includes("Mac")) deviceName = "Mac";
    else if (userAgent.includes("Android")) deviceName = "Android Device";
    else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) deviceName = "iOS Device";

    user.sessions.push({ sessionId, device: deviceName, ip: clientIp, createdAt: new Date() });
    if (user.sessions.length > 5) user.sessions.shift(); 
    await user.save();

    const jwtToken = jwt.sign(
      { userId: user._id, sessionId: sessionId }, 
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ token: jwtToken, plan: user.plan });
  } catch (err) {
    console.error("Login 2FA Error:", err);
    res.status(500).json({ error: "2FA Verification failed" });
  }
};



export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId; // Provided by your JWT auth middleware

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both current and new passwords are required." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Prevent Google OAuth users from setting a password here
    if (user.googleId && !user.passwordHash) {
      return res.status(400).json({ error: "Google accounts cannot change passwords here." });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect current password." });
    }

    // Hash and save new password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ error: "Failed to update password." });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;

    // 1. Delete all API Keys associated with the user
    await ApiKey.deleteMany({ userId: userId });

    // 2. Delete all Logs generated by the user
    await Log.deleteMany({ user: userId });

    // 3. Delete the User
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: "Account and all data permanently deleted." });
  } catch (err) {
    console.error("Delete Account Error:", err);
    res.status(500).json({ error: "Failed to delete account." });
  }
};
import speakeasy from "speakeasy";
import QRCode from "qrcode";

// --- 2FA Setup ---
export const generate2FA = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // 1. Generate the secret using Speakeasy
    const secret = speakeasy.generateSecret({ 
      name: `Aanya AI (${user.email})` 
    });
    
    // 2. Save the base32 version of the secret to the database
    user.twoFactorSecret = secret.base32;
    await user.save();

    // 3. Generate the QR Code URL directly from Speakeasy's otpauth_url
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({ qrCodeUrl, secret: secret.base32 });
  } catch (err) {
    console.error("🔥 2FA Generate Error:", err);
    res.status(500).json({ error: "Failed to generate 2FA" });
  }
};

export const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.userId);

    console.log(`🔎 Verifying PIN: [${token}] against Secret: [${user.twoFactorSecret}]`);

    // Verify the PIN with a "window" to handle time-sync issues
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2 // 👈 THIS IS THE MAGIC FIX (Allows 30 seconds of leeway before/after)
    });

    if (!isValid) {
      console.log("❌ PIN rejected by speakeasy!");
      return res.status(400).json({ error: "Invalid PIN" });
    }

    console.log("✅ PIN Accepted! Enabling 2FA for user.");
    user.isTwoFactorEnabled = true;
    await user.save();
    
    res.json({ success: true, message: "2FA Enabled Successfully!" });
  } catch (err) {
    console.error("🔥 2FA Verify Error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
};

// --- Session Management ---
export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const user = await User.findById(req.userId);
    
    // Remove the session from the array
    user.sessions = user.sessions.filter(s => s.sessionId !== sessionId);
    await user.save();
    
    res.json({ success: true, message: "Session revoked." });
  } catch (err) {
    res.status(500).json({ error: "Failed to revoke session" });
  }
};

export const verifyPcLink = async (req, res) => {
  try {
    const { email, password, apiKey } = req.body;

    // 1. Find User
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    // 2. Verify Password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // 3. Verify API Key belongs to this user and is active
    const keyRecord = await ApiKey.findOne({ key: apiKey, userId: user._id, active: true });
    if (!keyRecord) return res.status(403).json({ error: "Invalid or inactive API Key" });

    res.json({ success: true, message: "PC Linked Successfully" });
  } catch (err) {
    console.error("PC Link Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};