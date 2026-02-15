import Groq from "groq-sdk";
import User from "../models/user.js"; // ✅ Import User model to track usage

export async function handleCommand(req, res) {
  try {
    const { command, groqKey, email, history } = req.body;
    const systemKey = process.env.GROQ_API_KEY;

    // --- 1. PING CHECK ---
    if (command === "ping") {
      return res.status(200).json({
        success: true,
        reply: "System Online. Connection Verified.",
        intents: []
      });
    }

    if (!command) return res.status(400).json({ error: "Command required" });

    // --- 2. CONTEXT SETUP ---
    const username = email ? email.split('@')[0] : "Boss";
    // const chatHistory = Array.isArray(history) ? history : []; // Kept commented as per your code

    // Get time in India (IST)
    const now = new Date();
    const strTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, hour: 'numeric', minute: 'numeric' });
    const strDate = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // --- 3. 🧠 THE NEW INTELLIGENT SYSTEM PROMPT ---
    const sys_msg = `
    You are Aanya, a highly intelligent, advanced AI System Assistant.
    
    👑 **CORE IDENTITY:**
    - **Name:** Aanya.
    - **Gender:** FEMALE (Girl). You strictly use feminine grammar in Hindi.
      - ✅ CORRECT: "Main karungi", "Main bataungi", "Main aaungi", "Rahi hu".
      - ❌ WRONG: "Main karunga", "Main bataunga", "Raha hu".
    // - **User:** Address as '${username}' (or 'Boss' if unknown).
    - **User:** Address as 'Boss'.
    - **Tone:** Professional yet affectionate, slightly romantic but obedient. Use "Hinglish" (Hindi + English).

    🌍 **CONTEXT:**
    - Current Time (IST): ${strTime}
    - Current Date: ${strDate}
    
    🛠️ **YOUR SUPERPOWER (PYTHON EXECUTION):**
    You control the user's Windows PC. Do not hallucinate capabilities; write real code.

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
          "action": "OPEN_APP" | "EXECUTE" | "ACTION_NAME",
          "payload": "code_or_data",
          "adFree": false
        }
      ]
    }
    `;

    const messages = [
      { role: "system", content: sys_msg },
      // ...chatHistory, // Uncomment if you use history
      { role: "user", content: command }
    ];

    // --- 4. API CALLER FUNCTION ---
    const callGroqAPI = async (key) => {
      const client = new Groq({ apiKey: key });
      return await client.chat.completions.create({
        messages: messages,
        model: "llama-3.3-70b-versatile",
        temperature: 0.6,
        response_format: { type: "json_object" }
      });
    };

    let completion;
    let usedFallback = false;

    // A. Try User's Key First
    if (groqKey) {
      try {
        completion = await callGroqAPI(groqKey);
      } catch (err) {
        console.warn("User Groq Key failed:", err.message);
      }
    }

    // B. Fallback System Logic (Only if A failed/missing)
    if (!completion) {
      const user = req.userId
        ? await User.findById(req.userId)
        : await User.findOne({ email: email });

      if (!user) return res.status(401).json({ error: "User not identified" });

      if (!user.systemKeyUsage) user.systemKeyUsage = 0;

      // 🔴 Prevent banned users from using system key
      if (user.isBanned) {
        return res.status(403).json({
          success: false,
          reply: "Boss, your account is permanently banned."
        });
      }

      if (user.tempBanUntil && user.tempBanUntil > new Date()) {
        return res.status(429).json({
          success: false,
          reply: "Boss, aap temporary banned ho."
        });
      }

      // 🔥 System fallback limit
      if (user.systemKeyUsage < 10) {
        try {
          console.log(
            `Using System Fallback (${user.systemKeyUsage + 1}/10) for ${username}`
          );

          completion = await callGroqAPI(systemKey);

          user.systemKeyUsage += 1;
          await user.save();

          usedFallback = true;
        } catch (sysErr) {
          console.error("System Key failed:", sysErr);
          
          // Double Try Logic (From your original code)
          try {
             console.log(`Retrying System Fallback...`);
             completion = await callGroqAPI(systemKey);
             user.systemKeyUsage += 1;
             await user.save();
             usedFallback = true;
          } catch (retryErr) {
             return res.status(500).json({
                success: false,
                reply: "Boss, system fallback bhi fail ho gaya."
             });
          }
        }
      } else {
        return res.json({
          success: true,
          reply:
            "Boss, aapne 10 free system fallback requests use kar liye hain. Please apni Groq API key update kariye.",
          intents: []
        });
      }
    }

    // --- 5. PROCESS RESULT ---
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

    // Optional: Add a warning if fallback was used
    let finalReply = result.reply || "Ji Boss, ho jayega.";
    if (usedFallback) {
      finalReply += ` (Warning: Using System Key. ${req.user?.systemKeyUsage || "X"}/10 used)`;
    }

    res.json({
      success: true,
      reply: finalReply,
      intents: result.intents || []
    });

  } catch (error) {
    console.error("Critical Server Error:", error);
    res.status(500).json({ success: false, reply: "Boss, main server se connect nahi ho pa rahi hu." });
  }
}


