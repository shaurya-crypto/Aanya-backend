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
import versionRoute from "./routes/version.js";

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/command", commandRoutes);
app.use("/version", versionRoute);


app.get("/", (req, res) => {
  res.json({ status: "Aanya API running" });
});

// ... (Your existing code)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);


  const RENDER_URL = "https://aanya-backend.onrender.com"; // Replace with your actual URL

  const keepAlive = () => {
    // 14 minutes = 840,000 ms
    // Render sleeps after 15 mins of inactivity
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
