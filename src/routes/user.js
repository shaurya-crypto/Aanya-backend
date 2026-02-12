import express from "express";
import jwtAuth from "../middleware/jwtAuth.js"; // <--- Use JWT Auth
import { getDashboardData } from "../controllers/UserController.js";
import { generateKey, deleteKey, toggleKey } from "../controllers/apiKeyController.js";

const router = express.Router();

// All these routes are protected by JWT (Login Token)
router.get("/dashboard", jwtAuth, getDashboardData);
router.post("/generate-key", jwtAuth, generateKey);
router.delete("/key/:id", jwtAuth, deleteKey);
router.put("/key/:id/toggle", jwtAuth, toggleKey);

export default router;