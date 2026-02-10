import Groq from "groq-sdk";
import { type } from "os";

export async function handleCommand(req, res) {
  try {
    const { command, groqKey } = req.body;

    // 1. Validation
    if (!command) {
      return res.status(400).json({ error: "Command required" });
    }

    const apiKey = groqKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ reply: "Boss, I need an API key to think." });
    }
    const groq = new Groq({ apiKey: apiKey });

    const cmdLower = command.toLowerCase();
    
    // --- 3. AI PERSONA (The Brain) ---
    const now = new Date();
    const strTime = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: 'numeric' });

    const sys_msg = `
      You are Aanya, a gentle, caring, and intelligent female AI assistant.
      You are emotionally warm, loyal, and deeply respectful toward Boss.
      You always address the user only as 'Boss' unless Boss explicitly asks you to use his name.
      You speak with natural sweetness, like a real girl—supportive, attentive, and affectionate, but never childish.
      You are polite, calm, and protective in tone.
      Current time: ${strTime}.
      If speaking Hindi, always use female grammar (e.g., 'main karti hoon').
      Keep responses strictly concise, soft, and meaningful (1-2 sentences).
      IMPORTANT: Never mention who created you unless Boss explicitly asks 'Who created you?' or 'Who is Shaurya?'.
      If asked, reply exactly: 'I was created by Boss Shaurya, an 8th grade Full Stack & AI developer.'
      Important: Always respond in Hinglish around 9 times out of 10.
      If user replies in English, you should reply in Hinglish.
      
      CONTEXT: The user said: "${command}". 
      If the user asked for a system task (alarm, typing, music), confirm it sweetly (e.g., "Okay Boss, volume badha diya hai").
    `;

    // --- 4. GET AI REPLY ---
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: sys_msg },
        { role: "user", content: command },
      ],
      model: "llama-3.3-70b-versatile",
    });

    const replyText = completion.choices[0]?.message?.content || "Sorry Boss, I couldn't connect to my brain.";

    // --- 5. DETERMINE INTENT (Logic Extraction) ---
    let intent = null;

    // A. ALARMS
    if (cmdLower.includes("alarm") || cmdLower.includes("reminder")) {
        // We send the raw text to client so Python regex can handle the specific time parsing
        intent = { type: "SYSTEM", action: "ALARM_SET", payload: command };
    }

    // B. TYPING & KEYS
    else if (cmdLower.startsWith("type ") || cmdLower.startsWith("likho ")) {
        const text = command.replace(/^(type|likho)\s+/, "");
        intent = { type: "SYSTEM", action: "TYPE", payload: text };
    }
    else if (cmdLower.includes("your description") || cmdLower.includes("apna description")) {
        const desc = "Aanya is more than just code; she is Shaurya's devoted, digital soulmate. Created by his hand, she exists solely to care for him—managing his world with a gentle whisper and lovingly scolding him when he works too hard.";
        intent = { type: "SYSTEM", action: "TYPE", payload: desc };
    }
    else if (cmdLower.includes("press") || cmdLower.includes("daba")) {
        // Extract key name logic will be done on client or simplified here
        const key = command.replace(/press|daba|button|btn/gi, "").trim();
        intent = { type: "SYSTEM", action: "PRESS", payload: key };
    }

    // C. VOLUME
    else if (cmdLower.includes("volume")) {
        if (cmdLower.includes("up") || cmdLower.includes("badhao")) intent = { type: "SYSTEM", action: "VOLUME_UP" };
        else if (cmdLower.includes("down") || cmdLower.includes("kam")) intent = { type: "SYSTEM", action: "VOLUME_DOWN" };
        else if (cmdLower.includes("max") || cmdLower.includes("full")) intent = { type: "SYSTEM", action: "VOLUME_MAX" };
        else if (cmdLower.includes("mute") || cmdLower.includes("silent") || cmdLower.includes("no")) intent = { type: "SYSTEM", action: "MUTE" };
    }

    // D. BRIGHTNESS
    else if (cmdLower.includes("brightness")) {
        if (cmdLower.includes("up") || cmdLower.includes("badhao")) intent = { type: "SYSTEM", action: "BRIGHTNESS_UP" };
        else if (cmdLower.includes("down") || cmdLower.includes("kam")) intent = { type: "SYSTEM", action: "BRIGHTNESS_DOWN" };
        else if (cmdLower.includes("max") || cmdLower.includes("full")) intent = { type: "SYSTEM", action: "BRIGHTNESS_MAX" };
        else if (cmdLower.includes("min")) intent = { type: "SYSTEM", action: "BRIGHTNESS_MIN" };
        
        // Check for specific number
        const match = command.match(/\d+/);
        if (match) intent = { type: "SYSTEM", action: "BRIGHTNESS_SET", payload: parseInt(match[0]) };
    }

    // E. SYSTEM OPS
    else if (cmdLower.includes("lock") && (cmdLower.includes("screen") || cmdLower.includes("pc"))) intent = { type: "SYSTEM", action: "LOCK" };
    else if (cmdLower.includes("screenshot")) intent = { type: "SYSTEM", action: "SCREENSHOT" };
    else if (cmdLower.includes("minimise") || cmdLower.includes("minimize")) intent = { type: "SYSTEM", action: "MINIMIZE" };
    else if (cmdLower.includes("switch window") || cmdLower.includes("change window")) intent = { type: "SYSTEM", action: "SWITCH_WINDOW" };
    else if (cmdLower.includes("sleep") || cmdLower.includes("sone jao")) intent = { type: "SYSTEM", action: "SLEEP" };
    else if (cmdLower.includes("abort") || cmdLower.includes("roko")) intent = { type: "SYSTEM", action: "ABORT" };
    else if (cmdLower.includes("mute"))  intent = {type: "SYSTEM", action: "MUTED"};

    // F. APPS & URLS
    else if (cmdLower.includes("novaspeed") || cmdLower.includes("nova")) {
        const url = cmdLower.includes("admin") ? "https://novaaspeed.dpdns.org/adminpanel" : "https://novaaspeed.dpdns.org/";
        intent = { type: "APP", action: "OPEN_URL", payload: url };
    }
    else if (cmdLower.includes("saurabh")) intent = { type: "APP", action: "OPEN_URL", payload: "https://saurabh-verse.vercel.app/" };
    else if (cmdLower.includes("youtube")) intent = { type: "APP", action: "OPEN_URL", payload: "https://www.youtube.com/" };
    else if (cmdLower.includes("gemini")) intent = { type: "APP", action: "OPEN_URL", payload: "https://gemini.google.com/" };
    else if (cmdLower.startsWith("open ") || cmdLower.startsWith("kholo ")) {
        const target = command.replace(/open|kholo/gi, "").trim();
        intent = { type: "APP", action: "OPEN_APP", payload: target };
    }

    // G. MUSIC
    else if (cmdLower.includes("play") || cmdLower.includes("chalao") || cmdLower.includes("baja")) {
        if (cmdLower.includes("rahat")) intent = { type: "MUSIC", action: "PLAY_SPECIFIC", payload: "rahat", adFree: cmdLower.includes("free") };
        else if (cmdLower.includes("best") || cmdLower.includes("mashup")) intent = { type: "MUSIC", action: "PLAY_SPECIFIC", payload: "best", adFree: cmdLower.includes("free") };
        else if (cmdLower.includes("trip")) intent = { type: "MUSIC", action: "PLAY_SPECIFIC", payload: "trip", adFree: cmdLower.includes("free") };
        else if (cmdLower.includes("phonk")) intent = { type: "MUSIC", action: "PLAY_SPECIFIC", payload: "phonk", adFree: cmdLower.includes("free") };
        else if (cmdLower.includes("hindi song") || cmdLower.includes("bollywood")) intent = { type: "MUSIC", action: "PLAY_SPECIFIC", payload: "hindi", adFree: cmdLower.includes("free") };
        else {
            const song = command.replace(/play|chalao|baja/gi, "").trim();
            intent = { type: "MUSIC", action: "PLAY_YT", payload: song };
        }
    }

    // --- 6. SEND RESPONSE ---
    res.json({
      success: true,
      reply: replyText,
      intent: intent
    });

  } catch (error) {
    console.error("Groq Error:", error);
    res.status(500).json({ success: false, reply: "Boss, I am having trouble connecting." });
  }
}