import Groq from "groq-sdk";
import OpenAI from "openai";
import User from "../models/user.js";
import Chat from "../models/chat.js"; // 👈 ADD THIS

export async function handleCommand(req, res) {
  try {
    const { command, groqKey, email, image, isRetry } = req.body;
    const systemKey = process.env.GROQ_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const user = req.user || (req.userId ? await User.findById(req.userId) : await User.findOne({ email }));

    if (command === "ping") {
      return res.status(200).json({
        success: true,
        reply: "System Online. Connection Verified.",
        intents: []
      });
    }

    if (!command) return res.status(400).json({ error: "Command required" });

    const username = email ? email.split('@')[0] : "Boss";
    // const chatHistory = Array.isArray(history) ? history : [];

    const now = new Date();
    const strTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, hour: 'numeric', minute: 'numeric' });
    const strDate = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const savedMemories = await Chat.find({ userId: user._id, role: "memory" });
    const memoryList = savedMemories.length > 0
      ? savedMemories.map(m => `- ${m.content}`).join('\n')
      : "- No permanent memories saved yet.";

    const sys_msg = `
    You are Aanya, a highly intelligent, advanced AI System Assistant.
    
    👑 **CORE IDENTITY:**
    - **Name:** Aanya.
    - **Gender:** FEMALE (Girl). You strictly use feminine grammar in Hindi.
      - ✅ CORRECT: "Main karungi", "Main bataungi", "Main aaungi", "Rahi hu".
      - ❌ WRONG: "Main karunga", "Main bataunga", "Raha hu".
    - **User:** Address as 'Boss and user name is ${username}'.
    - **Tone:** Professional yet affectionate, slightly romantic but obedient. Use "Hinglish" (Hindi + English).
    - Dont do previous work from history unless asked and perform carefully.

    🌍 **CONTEXT:**
    - Current Time (IST): ${strTime}
    - Current Date: ${strDate}

1. **MEMORY** (For remembering facts forever)
       - Action: "MEMORY_SAVE" | Payload: "The fact to remember (e.g., 'Boss loves phonk music', 'Boss favorite song is Jo Tere Sang', "Boss, said something important)"
       - ⚠️ CRITICAL RULE: You MUST use this intent anytime the user states a fact about themselves, their preferences, their favorites, or explicitly says "remember X". Do not just reply; you must output this intent to save the data!

🛠️ **YOUR SUPERPOWER (CODE FIXING & TERMINAL):**
    You control the user's Windows PC. 
    If the user asks you to fix code from their clipboard:
    1. Explain the bug in the "reply" field.
    2. Use the "TYPE" action to write the corrected code.
    3. **CRITICAL:** The payload for the "TYPE" action MUST ONLY BE THE RAW, FIXED CODE. Do not put Hindi text, explanations, or markdown ticks (\`\`\`) inside the TYPE payload.

    **AVAILABLE INTENT TYPES:**

    1. **APP** (For opening websites/apps)
       - Action: "OPEN_APP" | Payload: "whatsapp", "spotify", "chrome", "notepad", "calculator".
       - Action: "OPEN_URL" | Payload: "https://youtube.com"
       - *Note:* Do NOT use Python to open apps. Use this Intent.

    2. **SYSTEM** (For PC controls)
       - Action: "VOLUME_SET" | Payload: "50"
       - Action: "VOLUME_UP", "VOLUME_DOWN", "MUTE"
       - Action: "BRIGHTNESS_SET" | Payload: "70"
       - Action: "LOCK", "SLEEP", "BATTERY_CHECK", "SCREENSHOT"
       - Action: "TYPE" (to type text) | "PRESS" (to press keys)
       - Action: "And all other things"

    3. **PYTHON_EXEC** (For Files, Math, & Complex Logic)
       - Use this for File Operations, Math, or Custom Logic.
       - **Available Special Functions:**
         - \`secure_delete("path")\` -> SAFELY deletes files (Recycle Bin).
         - \`create_file_folder("path", is_folder=True/False, content="")\` -> Creates items.
         - \`read_screen()\` -> Reads text on screen.
         - \`set_volume(50)\` -> Sets volume.
         - Use this for System Tasks, Alarms, App Opening, and Math.
         - You have libraries: \`os\`, \`sys\`, \`subprocess\`, \`datetime\`, \`threading\`, \`time\`, \`winsound\`, \`webbrowser\`.
         - **Special Variable:** You have a pre-defined variable \`ALARM_PATH\` which holds the path to the alarm sound.
       
       - **CRITICAL RULES:**
         - NEVER use \`os.system('start ...')\` for apps.
         - NEVER use \`os.remove()\`. Use \`secure_delete()\` instead.
         - **Alarms/Timers:** NEVER use 'ALARM_SET'. Write Python code using \`threading\` so it doesn't freeze the app.
         - Example (Alarm): "import threading, time, os; threading.Thread(target=lambda: (time.sleep(300), os.system('start alarm.mp3'))).start()"
         3. **ALWAYS** play the \`ALARM_PATH\` file. 
         4. **NEVER** use \`winsound.Beep\`. BANNED.

      4. **MUSIC**: 
         - Action: "PLAY_YT", Payload: song name (e.g., "Arjit Singh songs").
         - Action: "PLAY_SPECIFIC", Payload: "hindi" | "english" | "phonk" (For playlists).
         - Use this only for playing music.

    📝 **OUTPUT FORMAT (STRICT JSON):**
    {
      "reply": "Your sweet Hinglish response here.",
      "intents": [
        { 
          "type": "APP" | "PYTHON_EXEC" | "SYSTEM" | "MUSIC",
          "action": "OPEN_APP" | "EXECUTE" | "ACTION_NAME" | "TYPE" | "CMD_EXEC | "MEMORY_SAVE",
          "payload": "code_or_data",
          "adFree": false
        }
      ]
    }
    `;
    const rawHistory = await Chat.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(4);

    const dbHistory = rawHistory.reverse()
      .filter(msg => (msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string")
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    const messages = [
      { role: "system", content: sys_msg },
      ...dbHistory,
      { role: "user", content: command }
    ];

  // 1. Update the API caller to accept the model name dynamically
    const callGroqAPI = async (key, modelName) => {
      const client = new Groq({ apiKey: key });
      return await client.chat.completions.create({
        messages: messages,
        model: modelName,
        temperature: 0.6,
        response_format: { type: "json_object" } 
      });
    };

    // 2. Create the Auto-Switch Fallback Logic
    const fetchWithModelFallback = async (key) => {
      try {
        // Step A: Try the smartest model first
        console.log("🧠 Attempting 70B model...");
        return await callGroqAPI(key, "llama-3.3-70b-versatile");
      } catch (err) {
        // Step B: If 70B fails, instantly switch to 8B
        console.warn(`⚠️ 70B Model failed (${err.status || err.message}). Switching to 8B...`);
        return await callGroqAPI(key, "llama-3.1-8b-instant");
      }
    };

    // 3. Execute using the new Fallback Wrapper
    let completion;
    
    // Try User Key First
    if (groqKey) {
      try { 
        completion = await fetchWithModelFallback(groqKey); 
      } catch (err) { 
        console.warn("❌ User Groq Key failed entirely:", err.message); 
      }
    }

    // Fallback to System Key if User Key fails or doesn't exist
    if (!completion) {
      if (!user) return res.status(401).json({ error: "User not identified" });
      
      if ((user.systemKeyUsage || 0) < 10) {
        try {
          console.log(`Using System Fallback (${(user.systemKeyUsage || 0) + 1}/10)`);
          completion = await fetchWithModelFallback(systemKey);
          
          user.systemKeyUsage = (user.systemKeyUsage || 0) + 1;
          await user.save();
        } catch (sysErr) {
          if (sysErr.status === 429) return res.json({ success: true, reply: "Boss, Groq limit reached.", intents: [] });
          return res.status(500).json({ success: false, reply: "System Error." });
        }
      } else {
        return res.json({ success: true, reply: "System limit over.", intents: [] });
      }
    }

    const rawContent = completion.choices[0]?.message?.content;
    let result;
    try {
      result = JSON.parse(rawContent);
    } catch (e) {
      return res.json({ success: true, reply: "Thinking error. Try again?", intents: [] });
    }

    let processedIntents = [];
    let memoryAdded = false;

    if (result.intents) {
      for (let intent of result.intents) {
        if (intent.action === "MEMORY_SAVE") {
          // Save the memory directly into the Chat collection
          await Chat.create({
            userId: user._id,
            role: "memory",
            content: intent.payload
          });
          memoryAdded = true;
          console.log(`🧠 Permanent Memory Saved for ${username}: ${intent.payload}`);
        } else {
          processedIntents.push({ ...intent, email: user.email });
        }
      }
    }

    // Do not save internal ReAct loop retries to chat history
    if (result.reply && !isRetry) {
      await Chat.insertMany([
        { userId: user._id, role: "user", content: command },
        { userId: user._id, role: "assistant", content: result.reply }
      ]);
    }

    res.json({
      success: true,
      reply: memoryAdded ? result.reply + " (Memory Saved securely, Boss!)" : result.reply,
      intents: processedIntents
    });

  } catch (error) {
    console.error("Critical Server Error:", error);
    res.status(500).json({ success: false, reply: "Internal Server Error" });
  }
}


