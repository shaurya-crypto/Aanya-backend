import jwt from "jsonwebtoken";
import User from "../models/user.js"; // 👈 We need the User model now

const jwtAuth = async (req, res, next) => { // 👈 Make sure this is async
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    // If the token has a sessionId, check if it's still in the database
    if (decoded.sessionId) {
      const sessionExists = user.sessions.some(s => s.sessionId === decoded.sessionId);
      if (!sessionExists) {
        // The session was revoked! Reject the request.
        return res.status(401).json({ error: "Session expired or revoked. Please log in again." });
      }
    }
    // -------------------------------------------

    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export default jwtAuth;