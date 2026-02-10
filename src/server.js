import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });


import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import commandRoutes from "./routes/command.js";

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/command", commandRoutes);

app.get("/", (req, res) => {
  res.json({ status: "Aanya API running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});