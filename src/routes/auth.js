import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { verifyLogin2FA } from "../controllers/authController.js"; // add to imports at top
import { verifyPcLink } from "../controllers/authController.js";
import { register, login, changePassword, deleteAccount } from "../controllers/authController.js";
import jwtAuth from "../middleware/jwtAuth.js";
import { generate2FA } from "../controllers/authController.js";
import { verify2FA } from "../controllers/authController.js";
import { revokeSession } from "../controllers/authController.js";




// ✅ FIX: Load .env variables immediately before Passport tries to use them
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import User from "../models/user.js";
// import { register, login } from "../controllers/authController.js";

const backend_url = process.env.BACKEND_URL;
const frontend_url = process.env.FRONTEND_URL;


const router = express.Router();

// --- 1. PASSPORT GOOGLE STRATEGY CONFIGURATION ---
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${backend_url}/auth/google/callback`, 
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("🟢 Google profile received:", profile.displayName);
      try {
        let user = await User.findOne({
          $or: [{ googleId: profile.id }, { email: profile.emails[0].value }],
        });

        if (!user) {
          console.log("🟢 Creating new user from Google...");
          user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            plan: "free",
          });
        } else if (!user.googleId) {
          console.log("🟢 Linking Google to existing account...");
          user.googleId = profile.id;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        console.error("🔴 Google Strategy Error:", err);
        return done(err, null);
      }
    }
  )
);

// --- 2. EXISTING LOCAL ROUTES ---
router.post("/register", register);
router.post("/login", login);
router.post("/verify-pc-link", verifyPcLink);
router.post("/verify-login-2fa", verifyLogin2FA);
// --- NEW SECURITY ROUTES ---
router.post("/change-password", jwtAuth, changePassword);
router.delete("/delete-account", jwtAuth, deleteAccount);
router.get("/google", (req, res, next) => {
    console.log("🟢 Hit /auth/google route!");
    next();
}, passport.authenticate("google", { scope: ["profile", "email"] }));
router.post("/generate-2fa", jwtAuth, generate2FA);
router.post("/verify-2fa", jwtAuth, verify2FA);
router.post("/revoke-session", jwtAuth, revokeSession);

// Route 2: Google Callback Route
router.get("/google/callback", (req, res, next) => {
    console.log("🟢 Hit /auth/google/callback route!");
    next();
},
  passport.authenticate("google", { session: false, failureRedirect: `${frontend_url}/auth` }),
  async (req, res) => { // 👈 MAKE THIS FUNCTION ASYNC
    console.log("🟢 Generating JWT for user:", req.user.email);
    
    // --- 🚀 NEW: ACTIVE SESSION TRACKING FOR GOOGLE OAUTH ---
    const crypto = await import('crypto');
    const sessionId = crypto.randomBytes(16).toString("hex");
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    
    // Fetch the user to update their sessions array
    const user = await User.findById(req.user._id);
    
    user.sessions.push({
      sessionId,
      device: "Google OAuth Login", // Harder to get user-agent reliably here, so we label it
      ip: clientIp,
      createdAt: new Date()
    });
    
    if (user.sessions.length > 5) {
      user.sessions.shift();
    }
    
    await user.save();
    // -------------------------------------------------------

    const token = jwt.sign(
      { userId: user._id, sessionId: sessionId },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    
    // console.log("🟢 Redirecting to frontend with token...");
    res.redirect(`${frontend_url}/auth?token=${token}`);
  }
);

export default router;