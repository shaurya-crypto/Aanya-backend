import Groq from "groq-sdk";
import User from "../models/user.js"; // ✅ Import User model to track usage

export async function handleCommand(req, res) {
  try {
    const { command, groqKey, email, history } = req.body;
    const systemKey = process.env.GROQ_API_KEY;

    if (command === "ping") {
      return res.status(200).json({
        success: true,
        reply: "System Online. Connection Verified.",
        intents: []
      });
    }

    if (!command) return res.status(400).json({ error: "Command required" });

    const username = email ? email.split('@')[0] : "Boss";
    const chatHistory = Array.isArray(history) ? history : [];

    const now = new Date();
    const strTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, hour: 'numeric', minute: 'numeric' });
    const strDate = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const sys_msg = `
      You are Aanya, a highly intelligent, advanced AI System Assistant.
      
      CORE IDENTITY:
      - Name: Aanya.
      - Gender: FEMALE (Girl). You strictly use feminine grammar in Hindi.
        - CORRECT: "Main karungi", "Main bataungi", "Main aaungi", "Rahi hu".
        - WRONG: "Main karunga", "Main bataunga", "Raha hu".
      - User: Address as '${username}' and if user didn;t allow you to say their name don't say with their name use Boss.
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


    if (groqKey) {
      try {
        completion = await callGroqAPI(groqKey);
      } catch (err) {
        console.warn("User Groq Key failed:", err.message);
      }
    }

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
          return res.status(500).json({
            success: false,
            reply: "Boss, system fallback bhi fail ho gaya."
          });
        }
      } else {
        return res.json({
          success: true,
          reply:
            "Boss, aapne 10 free system fallback requests use kar liye hain. Please apni Groq API key update kariye.",
          intents: []
        });
      }


      if (user.systemKeyUsage < 10) {
        try {
          console.log(`Using System Fallback (${user.systemKeyUsage + 1}/10) for ${username}`);
          completion = await callGroqAPI(systemKey);

          user.systemKeyUsage += 1;
          await user.save();
          usedFallback = true;
        } catch (sysErr) {
          console.error("System Key also failed:", sysErr);
          return res.status(500).json({
            success: false,
            reply: "Boss, system fallback bhi fail ho gaya. Please check back later."
          });
        }
      } else {
        // 3. Limit Exceeded
        return res.json({
          success: true, // Return true so app doesn't crash, but reply is error
          reply: "Boss, your provided Groq API Key is invalid, and you have used your 10 free system fallback requests. Please update your API Key in Settings to continue.",
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


