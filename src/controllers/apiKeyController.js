import { v4 as uuidv4 } from "uuid";
import ApiKey from "../models/Apikey.js";
import User from "../models/user.js";

export const generateKey = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ error: "Key Name is required" });

    const key = `aanya_${uuidv4().replace(/-/g, "")}`;
    
    const newApiKey = await ApiKey.create({ 
        key, 
        userId,
        name,
        description
    });

    // Link to user
    await User.findByIdAndUpdate(userId, { $push: { apiKeys: newApiKey._id } });

    res.json({ success: true, apiKey: newApiKey });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate key" });
  }
};

// DELETE KEY
export const deleteKey = async (req, res) => {
    try {
        const { id } = req.params;
        await ApiKey.findOneAndDelete({ _id: id, userId: req.userId });
        await User.findByIdAndUpdate(req.userId, { $pull: { apiKeys: id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Delete failed" });
    }
};

// TOGGLE ACTIVE STATUS
export const toggleKey = async (req, res) => {
    try {
        const { id } = req.params;
        const key = await ApiKey.findOne({ _id: id, userId: req.userId });
        
        if (!key) return res.status(404).json({ error: "Key not found" });

        key.active = !key.active;
        await key.save();

        res.json({ success: true, active: key.active });
    } catch (err) {
        res.status(500).json({ error: "Update failed" });
    }

};
