import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    // FIX: Python script looks for "version", not "latest"
    version: "4.5.7", 
    // FIX: Python script looks for "url", not "downloadUrl"
    url: "https://github.com/shaurya-crypto/Aanya-Application/releases/download/4.5.7/Aanya_Setup.exe",
    notes: "Improved voice stability and faster response"
  });
});


export default router;

