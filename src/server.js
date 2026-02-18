import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import commandRoutes from "./routes/command.js";
import versionRoute from "./routes/version.js";
import userRoutes from "./routes/user.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

connectDB();


// ✅ MUST COME BEFORE ROUTES
app.use(cors({
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  credentials: true
}));

app.use(express.json());


app.use("/command", commandRoutes);
app.use("/auth", authRoutes);
app.use("/version", versionRoute);
app.use("/user", userRoutes);


app.get("/", (req, res) => {
  res.json({ status: "Aanya API running" });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);


  const RENDER_URL = "https://aanya-backend.onrender.com"; // Replace with your actual URL

  const keepAlive = () => {
    setTimeout(() => {
      console.log("Pinging server to keep awake...");

      fetch(`${RENDER_URL}/`)
        .then(res => console.log(`Ping successful: ${res.status}`))
        .catch(err => console.error(`Ping failed: ${err.message}`))
        .finally(() => keepAlive()); // Recursively call to keep loop going
    }, 840000); 
  };

  // Start the loop
  keepAlive();
});