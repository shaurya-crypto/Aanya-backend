import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    latest: "2.5.0",
    minSupported: "2.5.0",
    downloadUrl: "https://github.com/shaurya-crypto/Aanya-Application/releases/download/2.5.0/Aanya.AI.exe",
    notes: "Improved voice stability and faster response"
  });
});

export default router;
