import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    // FIX: Python script looks for "version", not "latest"
    version: "2.6.8", 
    // FIX: Python script looks for "url", not "downloadUrl"
    url: `https://github.com/shaurya-crypto/Aanya-Application/releases/download/{version}/AanyaAI.v{version}.exe`,
    notes: "Improved voice stability and faster response"
  });
});


export default router;



