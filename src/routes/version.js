import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    // These keys MUST match what update_checker.py is looking for
    version: "1.5.0",  
    url: "https://github.com/shaurya-crypto/Aanya-Application/releases/download/1.5.0/Aanya.AI.exe",
    
    // Optional info for display
    notes: "Now with Unlimited Memory and User Name recognition."
  });
});

export default router;
