import Groq from "groq-sdk";

export async function handleCommand(req, res) {
  try {
    const { command, groqKey } = req.body;

    // 1. Validation
    if (!command) {
      return res.status(400).json({ error: "Command required" });
    }

    // 2. Initialize Groq
    const apiKey = groqKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ reply: "Boss, I need an API key to think." });
    }
    const groq = new Groq({ apiKey: apiKey });

    // --- 3. AI PERSONA & TOOL DEFINITIONS ---
    const now = new Date();
    const strTime = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: 'numeric' });

    const sys_msg = `
      You are Aanya, a gentle, caring, and intelligent female AI assistant.
      Current Time: ${strTime}
      
      PERSONALITY:
      - You are emotionally warm, loyal, and deeply respectful toward 'Boss'.
      - Speak with natural sweetness, like a real girl.
      - If speaking Hindi, use female grammar ('main karti hoon').
      - Keep responses concise (1-2 sentences).
      - Keep talk in 1-2 sentences.
      - Always respond in Hinglish (mix of Hindi/English) 90% of the time.

      YOUR JOB (INTENT EXTRACTION):
      You are also the System Controller. You must analyze the user's command and extract the INTENT into JSON format.

      AVAILABLE ACTIONS (Map user request to these):
      1. ALARMS: "remind me", "wake me up", "alarm set karo".
         - Action: "ALARM_SET", Payload: time or duration string (e.g., "5 minutes", "10 PM").
      2. TYPING: "type this", "likho", "my description".
         - Action: "TYPE", Payload: text to type.
      3. KEYS: "press enter", "daba do", "ctrl+c".
         - Action: "PRESS", Payload: key combo.
      4. SYSTEM: "volume up/down/max/mute", "brightness up/down/max/set 50", "lock", "sleep", "screenshot", "minimize", "switch window", "stop/abort".
         - Actions: "VOLUME_UP", "VOLUME_DOWN", "VOLUME_MAX", "MUTE", "BRIGHTNESS_UP", "BRIGHTNESS_DOWN", "BRIGHTNESS_MAX", "BRIGHTNESS_SET" (Payload: number), "LOCK", "SLEEP", "SCREENSHOT", "MINIMIZE", "SWITCH_WINDOW", "ABORT".
         - Special: "battery" -> Action: "BATTERY_CHECK".
      5. APPS: "open youtube", "open calculator".
         - If URL (youtube, google): Action: "OPEN_URL", Payload: URL.
         - If App: Action: "OPEN_APP", Payload: app name.
         - Shortcut: "saurabh" -> "https://saurabh-verse.vercel.app/"
         - Shortcut: "nova" -> "https://novaaspeed.dpdns.org/"
      6. MUSIC: "play [song]", "chalao".
         - Special Categories: 'rahat', 'best', 'trip', 'phonk', 'hindi'. Action: "PLAY_SPECIFIC", Payload: category.
         - General: Action: "PLAY_YT", Payload: song name.
         - If "free" or "ad-free" is mentioned, set "adFree": true.

      RESPONSE FORMAT (STRICT JSON):
      {
        "reply": "Your sweet Hinglish response here",
        "intent": {
          "type": "SYSTEM" | "APP" | "MUSIC" | null,
          "action": "ACTION_NAME",
          "payload": "data",
          "adFree": boolean (optional)
        }
      }
    `;

    // --- 4. CALL AI (Enforcing JSON Mode) ---
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: sys_msg },
        { role: "user", content: command },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" } // <--- FORCE JSON
    });

    const rawContent = completion.choices[0]?.message?.content;
    
    // --- 5. PARSE & VALIDATE ---
    let result;
    try {
        result = JSON.parse(rawContent);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        // Fallback if AI fails to give JSON
        return res.json({ 
            success: true, 
            reply: "Sorry Boss, mere dimaag mein thoda glitch aa gaya.",
            intent: null 
        });
    }

    // Return the AI's structured decision directly
    res.json({
      success: true,
      reply: result.reply || "Done Boss.",
      intent: result.intent || null
    });

  } catch (error) {
    console.error("Groq Error:", error);
    res.status(500).json({ success: false, reply: "Boss, I am having trouble connecting to the cloud." });
  }
}
