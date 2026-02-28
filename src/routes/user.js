import express from "express";
import jwtAuth from "../middleware/jwtAuth.js"; 
import { getDashboardData } from "../controllers/UserController.js";
import { generateKey, deleteKey, toggleKey } from "../controllers/apiKeyController.js";
import User from "../models/user.js";
import ApiKey from "../models/Apikey.js";



const router = express.Router();

// --- 🔑 DASHBOARD & API KEYS ---
router.get("/dashboard", jwtAuth, getDashboardData);
router.post("/generate-key", jwtAuth, generateKey);
router.delete("/key/:id", jwtAuth, deleteKey);
router.put("/key/:id/toggle", jwtAuth, toggleKey);


router.post("/onboarding", jwtAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.profile = req.body;
    user.isOnboarded = true;
    await user.save();

    res.json({ success: true, message: "Onboarding complete" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save onboarding data" });
  }
});

router.post("/verify-pc-link", jwtAuth, async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: "API Key is required." });
    }
    
    // Check if the key exists, is active, AND belongs to this specific logged-in user
    const keyRecord = await ApiKey.findOne({ 
      key: apiKey, 
      userId: req.userId, // req.userId comes from your jwtAuth middleware
      active: true 
    });

    if (!keyRecord) {
      return res.status(403).json({ error: "Invalid API Key, or it does not belong to this account." });
    }

    // If it finds the key, it's a match!
    res.json({ success: true, message: "PC Linked Successfully" });

  } catch (err) {
    console.error("PC Link Verification Error:", err);
    res.status(500).json({ error: "Server error during verification." });
  }
});


export default router;