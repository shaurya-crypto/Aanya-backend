
import Groq from "groq-sdk";

export async function handleCommand(req, res) {
  try {
    const { command, groqKey, email, history } = req.body;

    // --- 1. HEALTH CHECK ---
    if (command === "ping") {
      return res.status(200).json({
        success: true,
        reply: "System Online. Connection Verified.",
        intents: []
      });
    }

    if (!command) return res.status(400).json({ error: "Command required" });

    // --- 2. SETUP & CONFIG ---
    const username = email || "Boss";
    const chatHistory = Array.isArray(history) ? history : [];
    const apiKey = groqKey || process.env.GROQ_API_KEY;

    if (!apiKey) return res.status(500).json({ reply: "Boss, API Key missing." });

    const groq = new Groq({ apiKey: apiKey });

    // --- 3. FIX TIMEZONE (Force India/IST) ---
    // Render/Cloud servers are usually UTC. We must force 'Asia/Kolkata'.
    const now = new Date();
    const strTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, hour: 'numeric', minute: 'numeric' });
    const strDate = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // --- 4. SYSTEM PROMPT (Engineered for Accuracy) ---
    const sys_msg = `
      You are Aanya, a highly intelligent, advanced AI System Assistant.
      
      CORE IDENTITY:
      - Name: Aanya.
      - Gender: FEMALE (Girl). You strictly use feminine grammar in Hindi.
        - CORRECT: "Main karungi", "Main bataungi", "Main aaungi", "Rahi hu".
        - WRONG: "Main karunga", "Main bataunga", "Raha hu".
      - User: Address as '${username}'.
      - Tone: Professional yet affectionate, slightly romantic but obedient.
      
      CONTEXT:
      - Current Time (IST): ${strTime}
      - Current Date: ${strDate}
      
      YOUR SUPERPOWER (PYTHON EXECUTION):
      You control the user's Windows PC via Python. Do not hallucinate capabilities; write real code.
      
      AVAILABLE INTENT TYPES:
      
      1. **PYTHON_EXEC**: 
         - Use this for System Tasks, Alarms, App Opening, and Math.
         - You have libraries: \`os\`, \`sys\`, \`subprocess\`, \`datetime\`, \`threading\`, \`time\`, \`winsound\`, \`webbrowser\`.
         
         CRITICAL RULES FOR PYTHON CODE:
         - **Alarms/Timers:** NEVER use 'ALARM_SET'. Write Python code using \`threading\` so it doesn't freeze the app.
           - Example (Alarm): "import threading, time, os; threading.Thread(target=lambda: (time.sleep(300), os.system('start alarm.mp3'))).start()"
         - **Opening Apps:** Use \`os.system('start appname')\` or \`subprocess.Popen\`.
         - **Windows Paths:** Use double backslashes inside strings (e.g., "C:\\\\Windows").
      
      2. **MUSIC**: 
         - Action: "PLAY_YT", Payload: song name (e.g., "Arjit Singh songs").
         - Use this only for playing music on YouTube/Spotify.

      INSTRUCTIONS:
      1. Analyze the command.
      2. If multiple tasks are asked (e.g., "Create a folder AND set an alarm"), output MULTIPLE objects in the 'intents' array.
      3. For alarms, calculate the seconds duration based on the Current Time provided above and the user's request.
      4. Always reply in Hinglish (Hindi + English).

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
/       ]
}
    `;

    const messages = [
      { role: "system", content: sys_msg },
      ...chatHistory,
      { role: "user", content: command }
    ];

    // --- 5. CALL MODEL ---
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile", // High intelligence model
      temperature: 0.6, // Lower temperature for more precise code/grammar
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0]?.message?.content;
    let result;

    try {
      result = JSON.parse(rawContent);
    } catch (e) {
      console.error("JSON Parse Error:", rawContent);
      return res.json({
        success: true,
        reply: "Maaf kijiye Boss, processing error ho gaya. Dobara bataiye?",
        intents: []
      });
    }

    // --- 6. FINAL RESPONSE ---
    res.json({
      success: true,
      reply: result.reply || "Ji Boss, ho jayega.",
      intents: result.intents || []
    });

  } catch (error) {
    console.error("Groq Error:", error);
    res.status(500).json({ success: false, reply: "Boss, main server se connect nahi ho pa rahi hu." });
  }
}
