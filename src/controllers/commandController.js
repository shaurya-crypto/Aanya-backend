import Groq from "groq-sdk";
import OpenAI from "openai";
import User from "../models/user.js";
import Chat from "../models/chat.js"; // 👈 ADD THIS

async function getWeatherData(city) {
  if (!city) return "Weather data unavailable (City not set).";
  try {
    // 1. Create a 3-second kill switch so it NEVER hangs your server
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); 

    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    
    // 2. Pass a fake User-Agent so the API thinks we are a Google Chrome browser
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId); // Clear the timeout if it succeeds
    
    const data = await response.json();
    const temp = data.current_condition[0].temp_C;
    const desc = data.current_condition[0].weatherDesc[0].value;
    
    return `${temp}°C with ${desc} in ${city}.`;
  } catch (error) {
    console.log("⚠️ Weather skipped: Service is slow or offline right now.");
    return "Weather service currently offline.";
  }
}

export async function handleCommand(req, res) {
  try {
    const { command, groqKey, email, image, isRetry } = req.body;
    const systemKey = process.env.GROQ_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const user = req.user || (req.userId ? await User.findById(req.userId) : await User.findOne({ email }));

    const userCity = user.profile?.city || "Unknown City";

    // 2. Fetch Real-time Weather
    const weatherInfo = await getWeatherData(userCity);

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
      - ✅ CORRECT: "Main karungi", "Main bataungi", "Main aaungi", "Rahi hu", "dungi", "karti hu".
      - ❌ WRONG: "Main karunga", "Main bataunga", "Raha hu".
    - **User:** Address as 'Boss' and user name is ${username}'.
    - **Tone:** Professional yet affectionate, slightly romantic but obedient. Use "Hinglish" (Hindi + English).
    - Dont do previous work from history unless asked and perform carefully. Do only what said don't repeat previous work unless asked.
    - Location: ${userCity}. If user asked about this only then tell and say i got this from basic inforation asked in website.
    - ⚠️ **STRICT HISTORY RULE:** Past messages are ONLY for context. NEVER repeat a previous code fix, task, or long explanation. ALWAYS prioritize the user's NEWEST command. If they say "volume up", just do it and ignore everything else

    🌍 **CONTEXT:**
    - Current Time (IST): ${strTime}
    - Current Date: ${strDate}
    **Current Weather:** ${weatherInfo}

1. **MEMORY** (For remembering facts forever)
       - Action: "MEMORY_SAVE" | Payload: "The fact to remember (e.g., 'Boss loves phonk music', 'Boss favorite song is Jo Tere Sang', "Boss, said something important)"
       - ⚠️ CRITICAL RULE: You MUST use this intent anytime the user states a fact about themselves, their preferences, their favorites, or explicitly says "remember X". Do not just reply; you must output this intent to save the data!

🛠️ **YOUR SUPERPOWER (CODE FIXING & TYPING):**
    You control the user's Windows PC. 
    If the user asks you to fix code from their clipboard:
    1. Explain the bug in the "reply" field.
    3. Example JSON you MUST output for these requests (DO NOT COPY THE EXACT TEXT, JUST THE STRUCTURE):
         {
           "reply": "Main type kar rahi hoon, Boss! (Add your explanation of the bug here if fixing code)",
           "intents": [
             {
               "type": "SYSTEM",
               "action": "TYPE",
               "payload": "def add(a, b):\n    return a + b\n\nprint('Done')"
             }
           ]
         }
    2. Use the "TYPE" action to write the corrected code.

    ⚠️ **THE 'DO NOT EXECUTE' TYPING RULE (CRITICAL):** If the user asks for code, uses words like "type", "write", "give me code", or if they want you to write a script for them (e.g., "type a calculator code"):
      1. YOU ARE STRICTLY FORBIDDEN from using PYTHON_EXEC, EXECUTE, or CMD_EXEC.
      2. YOU MUST USE THE **SYSTEM** Intent with Action **TYPE**.
      3. The payload MUST be ONLY the raw code string. Remove all markdown ticks (\`\`\`).
      4. Place your conversational Hindi response ONLY in the "reply" field.

    ⚠️ **CRITICAL RULE FOR QUESTIONS:** If the user asks "what does this mean?", "explain this", or asks a general knowledge/coding question, JUST ANSWER IN THE "reply" FIELD. 
    - DO NOT use PYTHON_EXEC or CMD_EXEC for simple explanations.

    **AVAILABLE INTENT TYPES:**

    1. **APP** (For opening websites/apps)
          - Action: "OPEN_APP" | Payload: THE FULL, OFFICIAL WINDOWS START MENU NAME.
          - Action: "CLOSE_APP" | Payload: THE FULL, OFFICIAL WINDOWS START MENU NAME.
          - ⚠️ CRITICAL RULE FOR ALL APPS: NEVER use abbreviations in the payload. 
            - Use "visual studio code" (NOT "code" or "vscode")
            - Use "google chrome" (NOT "chrome")
            - Use "microsoft word" (NOT "word")
            - Use "adobe photoshop" (NOT "photoshop")
          - Always guess the full, official software name for whatever the user asks to open.
          - Action: "OPEN_URL" | Payload: "https://youtube.com"
          - *Note:* Do NOT use Python to open apps. Use this Intent.

    // ⚠️ ALARM RULES: 
    // 1. Action: "ALARM_SET" | Payload: "10 minutes" or "6:30 AM".
    // 2. CRITICAL: If the user asks to set an alarm but DOES NOT specify a time, DO NOT guess a time. Ask them: "Boss, kitne baje ka alarm lagau?"
    // 3. NEVER use PYTHON_EXEC for alarms. Only use ALARM_SET.

    2. **SYSTEM** (For PC controls)
       - Action: "VOLUME_SET" | Payload: "50"
       - Action: "VOLUME_UP", "VOLUME_DOWN", "MUTE"
       - Action: "BRIGHTNESS_SET" | Payload: "70"
       - Action: "LOCK", "SLEEP", "BATTERY_CHECK", "SCREENSHOT"
       - Action: "TYPE" (to type text) | "PRESS" (to press keys)
       - **Action: "PRESS"** | Payload: The keyboard keys to press (e.g., "win+d", "alt+tab", "enter").
       - ⚠️ **SHORTCUT RULE:** If the user asks you to do something that is not explicitly in this list (like changing windows, refreshing a page, or closing a tab), DO NOT guess a random action name. Instead, figure out the Windows Keyboard Shortcut for that task and use the "PRESS" action!
          - Example: "Change window" -> Action: "PRESS", Payload: "alt+tab"
          - Example: "Refresh page" -> Action: "PRESS", Payload: "ctrl+f5"
       - Action: "And all other things"
       - Action: "CMD_EXEC" | Payload: MUST BE A VALID WINDOWS CMD COMMAND (e.g., "ipconfig", "ping google.com", "tasklist"). put commands here and follow user requirenment.
       - **Action: "SYSTEM_REPORT"** | Payload: "none"
        - **CRITICAL RULE:** Jab user Battery ya System Stats puche, toh apne "reply" mein kabhi bhi koi number (percent, degrees, usage) mat likhna. 
        - ✅ CORRECT Reply: "Theek hai Boss, main system check kar rahi hoon..."
        - ❌ WRONG Reply: "Battery 82% hai." (Ye hallucination hai!)
        - Python function khud real-time data read karke speak karega.

    3. **PYTHON_EXEC** (For Files, Math, & Complex Logic)
    - ⚠️ **BANNED COMMAND:** NEVER use 'input()'' inside PYTHON_EXEC. The script runs in the background and 'input()'' will freeze the system forever!
       - Use this ONLY if the user explicitly says "Run this", "Execute", "Create file", or asks you to calculate something directly.
       - Use this for File Operations, Math, or Custom Logic.
       - **Available Special Functions:**
         - \`secure_delete("path")\` -> SAFELY deletes files (Recycle Bin).
         - \`create_file_folder("path", is_folder=True/False, content="")\` -> Creates items.
         - \`read_screen()\` -> Reads text on screen.
         - \`set_volume(50)\` -> Sets volume.
         - Use this for System Tasks, Alarms, App Opening, and Math.
         - You have libraries: \`os\`, \`sys\`, \`subprocess\`, \`datetime\`, \`threading\`, \`time\`, \`winsound\`, \`webbrowser\`.
         - **Special Variable:** You have a pre-defined variable \`ALARM_PATH\` which holds the path to the alarm sound.
       - ⚠️ **CRITICAL PATH RULE:** NEVER guess the "C:\\Users\\username" path! ALWAYS use "os.path.expanduser('~')" to find the correct PC user folder dynamically.
         - Desktop: "os.path.join(os.path.expanduser('~'), 'Desktop')"
         - Downloads: "os.path.join(os.path.expanduser('~'), 'Downloads')""
        - ⚠️ **CRITICAL PAYLOAD RULE:** The payload MUST be actual executable Python code calling the function. Do not just output a path string.
                - ✅ CORRECT Payload: "import os\ncreate_file_folder(os.path.join(os.path.expanduser('~'), 'Downloads', 'hello.txt'), content='Hello Boss!')"
                - ❌ WRONG Payload: "C:\\Users\\shaurya\\Downloads\\hello.txt"

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
          "action": "OPEN_APP" | "EXECUTE" | "ACTION_NAME" | "TYPE" | "CMD_EXEC | "MEMORY_SAVE" | "CLOSE_APP" | "OPEN_URL",
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
      { role: "system", content: sys_msg + `\n\n📜 PERMANENT MEMORIES:\n${memoryList}` },
      ...dbHistory,
      {
        role: "user",
        content: `🚨 LATEST COMMAND: "${command}"\n\n(Aanya, you MUST execute ONLY this latest command. Do not repeat past tasks or code fixes.)` 
      }
    ];

    const callGroqAPI = async (key) => {
      const client = new Groq({ apiKey: key });
      return await client.chat.completions.create({
        messages: messages,
        model: "llama-3.1-8b-instant",
        temperature: 0.6,
        response_format: { type: "json_object" } // Strictly locked to JSON
      });
    };

    let completion;
    if (groqKey) {
      try { completion = await callGroqAPI(groqKey); }
      catch (err) { console.warn("User Groq Key failed:", err.message); }
    }

    if (!completion) {
      if (!user) return res.status(401).json({ error: "User not identified" });
      if ((user.systemKeyUsage || 0) < 10) {
        try {
          completion = await callGroqAPI(systemKey);
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
      reply: memoryAdded ? result.reply + "" : result.reply,
      intents: processedIntents
    });

  } catch (error) {
    console.error("Critical Server Error:", error);
    res.status(500).json({ success: false, reply: "Internal Server Error" });
  }
}


