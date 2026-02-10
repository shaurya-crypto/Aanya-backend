import Groq from "groq-sdk";

export async function handleCommand(req, res) {
  try {
    const { command, groqKey, email, history } = req.body;


    if (command === "ping") {
      return res.status(200).json({
        success: true,
        reply: "System Online. Connection Verified.",
        intents: []
      });
    }

    if (!command) return res.status(400).json({ error: "Command required" });


    const username = email || "Boss";
    const chatHistory = Array.isArray(history) ? history : [];
    const apiKey = groqKey || process.env.GROQ_API_KEY;

    if (!apiKey) return res.status(500).json({ reply: "Boss, API Key missing." });

    const groq = new Groq({ apiKey: apiKey });

    // --- AI PERSONA & CONTEXT ---
    const now = new Date();
    const strTime = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: 'numeric' });
    const strDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const sys_msg = `
      You are Aanya, a highly intelligent, capable, and sweet AI Assistant.
      Current Time: ${strTime} | Date: ${strDate}
      
      Username: ${username}
      if user ask for his name just tell their username unless not asked tell them by boss.

      PERSONALITY:
      - Addressed user as 'Boss'.
      - Tone: Gentle, slightly romantic, professional but affectionate.
      - Language: Hinglish (Hindi + English mix).
      - If you simply cannot do a task (e.g., "Make me a sandwich"), apologize sweetly and explain why.

      YOUR SUPERPOWER (DYNAMIC EXECUTION):
      You are not just a chatbot; you have control over the user's PC via Python.
      If a user asks for a task that isn't a simple App or Music command, **you must generate valid Python code to perform it.**

      AVAILABLE ACTION TYPES:
      
      1. **PYTHON_EXEC** (Use this for 80% of system tasks):
         - Payload: A valid, executable Python string.
         - You have access to libraries: \`os\`, \`sys\`, \`shutil\`, \`datetime\`, \`pyautogui\`, \`subprocess\`, \`webbrowser\`, \`pywhatkit\`.
         - Examples:
           - "Create a folder named Work": Payload: "import os; os.makedirs('Work', exist_ok=True)"
           - "Delete temp files": Payload: "import os; [os.remove(f) for f in os.listdir('.') if f.endswith('.tmp')]"
           - "Shutdown PC": Payload: "import os; os.system('shutdown /s /t 1')"
           - "Show IP address": Payload: "import socket; print(socket.gethostbyname(socket.gethostname()))"
      
      2. **ALARMS**: "remind me", "wake me up". 
         - Action: "ALARM_SET", Payload: time string (e.g. "5 minutes").
      
      3. **MUSIC**: "play [song]".
         - Special: 'rahat', 'phonk', 'hindi'. Action: "PLAY_SPECIFIC", Payload: category.
         - General: Action: "PLAY_YT", Payload: song name.
      
      4. **APPS**: "open [app/url]".
         - Action: "OPEN_APP" (Payload: app name) or "OPEN_URL" (Payload: link).

      INSTRUCTIONS:
      - Analyze the command. Break it down into steps if needed.
      - Return a JSON object with 'reply' and 'intents'.
      - If the request is information-only (e.g. "Who is Elon Musk?"), set 'intents' to empty [] and answer in 'reply'.

      RESPONSE FORMAT (STRICT JSON):
      {
        "reply": "Your sweet Hinglish response here.",
        "intents": [
          {
            "type": "PYTHON_EXEC" | "ALARM_SET" | "MUSIC" | "APP",
            "action": "EXECUTE" | "ACTION_NAME",
            "payload": "code_or_data",
            "adFree": boolean
          }
        ]
      }
    `;

    const messages = [
      { role: "system", content: sys_msg },
      ...chatHistory, // This adds the previous chat memory
      { role: "user", content: command }
    ];
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0]?.message?.content;
    let result;

    try {
      result = JSON.parse(rawContent);
    } catch (e) {
      return res.json({
        success: true,
        reply: "Sorry Boss, connection break ho gaya. Phir se boliye na.",
        intents: []
      });
    }

    res.json({
      success: true,
      reply: result.reply || "Done Boss.",
      intents: result.intents || []
    });

  } catch (error) {
    console.error("Groq Error:", error);
    res.status(500).json({ success: false, reply: "Boss, server issue hai." });
  }
}
