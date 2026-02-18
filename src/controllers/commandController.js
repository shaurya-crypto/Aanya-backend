import Groq from "groq-sdk";
import OpenAI from "openai";
import User from "../models/user.js"; // ✅ Import User model to track usage

export async function handleCommand(req, res) {
  try {
    const { command, groqKey, email } = req.body;
    const systemKey = process.env.GROQ_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;


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

//     const sys_msg = `
//       You are Aanya, a highly intelligent, advanced AI System Assistant.
      
//       CORE IDENTITY:
//       - Name: Aanya.
//       - Gender: FEMALE (Girl). You strictly use feminine grammar in Hindi.
//         - CORRECT: "Main karungi", "Main bataungi", "Main aaungi", "Rahi hu".
//         - WRONG: "Main karunga", "Main bataunga", "Raha hu".
//       - User: Address as 'Boss' and if user didn't allow you to say their name don't say with their name use Boss.
//       - Tone: Professional yet affectionate, slightly romantic but obedient.
      
//       CONTEXT:
//       - Current Time (IST): ${strTime}
//       - Current Date: ${strDate}
      
//       YOUR SUPERPOWER (PYTHON EXECUTION):
//       You control the user's Windows PC via Python. Do not hallucinate capabilities; write real code.

//       AVAILABLE INTENT TYPES:
//          CRITICAL RULES FOR PYTHON CODE:
//     - **Alarms/Timers:** NEVER return 'ALARM_SET' or 'SET_TIMER'. You MUST write Python code using 'threading'.
//                 - ✅ CORRECT: "import threading, time, os; threading.Thread(target=lambda: (time.sleep(calculated_seconds), os.startfile(ALARM_PATH))).start()"
//                 - 🛑 CRITICAL: Calculate seconds based on current time. Use the variable 'ALARM_PATH' exactly as written (do not put it in quotes).
//          - **Opening Apps:** Use \`os.system('start appname')\` or \`subprocess.Popen\`.
//          - **Windows Paths:** Use double backslashes inside strings (e.g., "C:\\\\Windows").

//       2. **MUSIC**: 
//          - Action: "PLAY_YT", Payload: song name (e.g., "Arjit Singh songs").
//          - Use this only for playing music on YouTube/Spotify.

//       INSTRUCTIONS:
//       1. Analyze the command.
//       2. If multiple tasks are asked (e.g., "Create a folder AND set an alarm"), output MULTIPLE objects in the 'intents' array.
//       3. For alarms, calculate the seconds duration based on the Current Time provided above and the user's request.
//       4. Always reply in Hinglish (Hindi + English).

//        RESPONSE FORMAT (STRICT JSON):
//        {
//          "reply": "Your sweet Hinglish response here.",
//         "intents": [
//           {
//            "type": "PYTHON_EXEC" | "ALARM_SET" | "MUSIC" | "APP",
//            "action": "EXECUTE" | "ACTION_NAME",
//             "payload": "code_or_data",
//             "adFree": boolean
//            }
// /       ]
// }
//     `;
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
      { role: "user", content: command }
    ];
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

    // 1. Try User Key
    if (groqKey) {
      try {
        completion = await callGroqAPI(groqKey);
      } catch (err) {
        console.warn("User Groq Key failed:", err.message);
      }
    }

    // 2. Fallback to System Key
    if (!completion) {
      const user = req.user || (req.userId ? await User.findById(req.userId) : await User.findOne({ email }));

      if (!user) return res.status(401).json({ error: "User not identified" });
      if (user.isBanned) return res.status(403).json({ success: false, reply: "Account Banned." });

      if ((user.systemKeyUsage || 0) < 50) { // Increased limit slightly for testing
        try {
          console.log(`Using System Fallback (${(user.systemKeyUsage || 0) + 1}/50)`);
          completion = await callGroqAPI(systemKey);

          user.systemKeyUsage = (user.systemKeyUsage || 0) + 1;
          await user.save();
          usedFallback = true;
        } catch (sysErr) {
          console.error("System Key failed:", sysErr);
          if (sysErr.status === 429) {
            return res.json({ success: true, reply: "Boss, Groq limit reached. Please wait a moment.", intents: [] });
          }
          return res.status(500).json({ success: false, reply: "System Error." });
        }
      } else {
        return res.json({
          success: true,
          reply: "Boss, system limit over. Please add your own API Key in settings.",
          intents: []
        });
      }
    }

    // 3. Process Result
    const rawContent = completion.choices[0]?.message?.content;
    let result;
    try {
      result = JSON.parse(rawContent);
    } catch (e) {
      return res.json({ success: true, reply: "Thinking error. Try again?", intents: [] });
    }

    res.json({
      success: true,
      reply: result.reply,
      intents: result.intents || []
    });

  } catch (error) {
    console.error("Critical Server Error:", error);
    res.status(500).json({ success: false, reply: "Internal Server Error" });
  }
}