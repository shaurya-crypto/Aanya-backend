import express from "express";
import http from "http"; // 👈 1. Import Node's native HTTP module
import { Server } from "socket.io"; // 👈 2. Import Socket.io
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import passport from "passport"; 

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import commandRoutes from "./routes/command.js";
import versionRoute from "./routes/version.js";
import userRoutes from "./routes/user.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Initialize App and HTTP Server
const app = express();
const server = http.createServer(app); // 👈 3. Wrap Express app with HTTP server

// Initialize Database
connectDB();

app.use(cors({
  origin: ["http://localhost:8080", "http://localhost:5173", "http://localhost:3000", "https://aanya-backend.onrender.com", "https://aanyaai.dpdns.org"], 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // ✅ Added OPTIONS
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  credentials: true
}));

app.use(express.json());
app.use(passport.initialize());

// --- HTTP Routes ---
app.use("/command", commandRoutes);
app.use("/auth", authRoutes); 
app.use("/version", versionRoute);
app.use("/user", userRoutes);

app.get("/", (req, res) => {
  res.json({ status: "Aanya API running" });
});


const io = new Server(server, {
  cors: {
    origin: "*", // Allow Python Desktop App & React App to connect freely
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("🟢 New WebSocket Connection:", socket.id);

  socket.on("join_room", ({ apiKey, role }) => {
    socket.join(apiKey);
    console.log(`🔗 ${role.toUpperCase()} joined secure room: ${apiKey}`);

    socket.to(apiKey).emit("system_message", `${role.toUpperCase()} is now online.`);
  });

  socket.on("send_command", ({ apiKey, command }) => {
    socket.to(apiKey).emit("execute_command", command);
  });


  socket.on("pc_response", ({ apiKey, reply }) => {
    socket.to(apiKey).emit("receive_response", reply);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Device Disconnected:", socket.id);
  });
});




const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server & WebSockets running on port ${PORT}`);

  const RENDER_URL = "https://aanya-backend.onrender.com"; 

  const keepAlive = () => {
    setTimeout(() => {
      console.log("Pinging server to keep awake...");
      fetch(`${RENDER_URL}/`)
        .then(res => console.log(`Ping successful: ${res.status}`))
        .catch(err => console.error(`Ping failed: ${err.message}`))
        .finally(() => keepAlive());
    }, 840000); // 14 minutes
  };

  keepAlive();

});


