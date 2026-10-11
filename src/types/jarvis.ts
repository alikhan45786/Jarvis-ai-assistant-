export type VisemeCode =
  | "SIL"
  | "AA"
  | "EE"
  | "II"
  | "OO"
  | "UU"
  | "MBP"
  | "FV"
  | "LTD"
  | "WR";

export type JarvisVoiceId =
  | "UrduMale_Asad"
  | "UrduMale_Farhan"
  | "Fenrir"
  | "Charon"
  | "Orus"
  | "Puck"
  | "UrduFemale_Zoya"
  | "Kore"
  | "Aoede"
  | "Zephyr";

export interface JarvisVoiceProfile {
  id: JarvisVoiceId;
  label: string;
  urduLabel: string;
  gender: "male" | "female";
  accent: string;
  geminiVoice: "Fenrir" | "Charon" | "Orus" | "Puck" | "Kore" | "Aoede" | "Zephyr";
  openaiVoice: "onyx" | "echo" | "fable" | "nova" | "shimmer";
  lang: string;
  fallbackLangs: string[];
  pitch: number;
  rateMultiplier: number;
  sampleText: string;
}

export const JARVIS_VOICE_PROFILES: JarvisVoiceProfile[] = [
  {
    id: "UrduMale_Asad",
    label: "Asad — Urdu / Roman Urdu Male (Default)",
    urduLabel: "اسد — اردو مردانہ آواز (مرد)",
    gender: "male",
    accent: "Pakistani Urdu & English Male",
    geminiVoice: "Charon",
    openaiVoice: "onyx",
    lang: "ur-PK",
    fallbackLangs: ["ur-PK", "ur", "hi-IN", "en-IN", "en-GB", "en-US"],
    pitch: 0.72,
    rateMultiplier: 1.0,
    sampleText:
      "Assalam-o-Alaikum Sir. Mera naam Jarvis hai aur meri Urdu mardana aawaz Asad bilkul tayyar hai. Aap ka kya hukam hai?",
  },
  {
    id: "UrduMale_Farhan",
    label: "Farhan — Deep Tactical Urdu Male",
    urduLabel: "فرحان — بھاری کمانڈر مردانہ آواز (مرد)",
    gender: "male",
    accent: "Deep Urdu / Hinglish Baritone",
    geminiVoice: "Charon",
    openaiVoice: "onyx",
    lang: "hi-IN",
    fallbackLangs: ["ur-PK", "hi-IN", "en-IN", "en-GB", "en-US"],
    pitch: 0.68,
    rateMultiplier: 0.96,
    sampleText:
      "Ji Commander. Jarvis ki heavy baritone mardana aawaz Farhan active kar di gayi hai.",
  },
  {
    id: "Fenrir",
    label: "Fenrir — Classic Jarvis British Male",
    urduLabel: "فینریر — کلاسک برطانوی جاروس (مرد)",
    gender: "male",
    accent: "British Butler Male",
    geminiVoice: "Fenrir",
    openaiVoice: "echo",
    lang: "en-GB",
    fallbackLangs: ["en-GB", "en-US", "en-IN"],
    pitch: 0.76,
    rateMultiplier: 1.0,
    sampleText:
      "Good day, Sir. Classic British Jarvis male voice synthesis is online and calibrated at your command.",
  },
  {
    id: "Charon",
    label: "Charon — Deep Armor Baritone Male",
    urduLabel: "شارون — گہری مردانہ آواز (مرد)",
    gender: "male",
    accent: "Tactical Baritone Male",
    geminiVoice: "Charon",
    openaiVoice: "onyx",
    lang: "en-US",
    fallbackLangs: ["en-US", "en-GB"],
    pitch: 0.7,
    rateMultiplier: 0.98,
    sampleText:
      "Armor core telemetry nominal, Sir. Deep tactical male baritone voice is locked in.",
  },
  {
    id: "Orus",
    label: "Orus — Titan Command Male",
    urduLabel: "اورس — ٹائٹن کمانڈ مردانہ آواز (مرد)",
    gender: "male",
    accent: "Ultra-Deep Command Male",
    geminiVoice: "Orus",
    openaiVoice: "onyx",
    lang: "en-GB",
    fallbackLangs: ["en-GB", "en-US"],
    pitch: 0.65,
    rateMultiplier: 0.95,
    sampleText:
      "All Jarvis defense and diagnostic protocols are standing by, Commander.",
  },
  {
    id: "Puck",
    label: "Puck — Crisp Articulate Male",
    urduLabel: "پک — تیز اور واضح مردانہ آواز (مرد)",
    gender: "male",
    accent: "Articulate Tenor Male",
    geminiVoice: "Puck",
    openaiVoice: "fable",
    lang: "en-IN",
    fallbackLangs: ["en-IN", "en-GB", "en-US"],
    pitch: 0.84,
    rateMultiplier: 1.04,
    sampleText:
      "Hello Sir! Fast, articulate male voice profile is active for rapid briefings and coding.",
  },
  {
    id: "UrduFemale_Zoya",
    label: "Zoya — Urdu / Roman Urdu Female",
    urduLabel: "زویا — اردو زنانہ آواز (خاتون)",
    gender: "female",
    accent: "Pakistani Urdu & English Female",
    geminiVoice: "Aoede",
    openaiVoice: "nova",
    lang: "ur-PK",
    fallbackLangs: ["ur-PK", "ur", "hi-IN", "en-IN", "en-GB", "en-US"],
    pitch: 1.12,
    rateMultiplier: 1.0,
    sampleText:
      "Assalam-o-Alaikum Sir. Zoya Urdu female voice profile active hai. Bataiye main aapki kya madad karoon?",
  },
  {
    id: "Kore",
    label: "Kore — F.R.I.D.A.Y. Tactical Female",
    urduLabel: "کور — فرائیڈے زنانہ آواز (خاتون)",
    gender: "female",
    accent: "Warm Studio Female",
    geminiVoice: "Kore",
    openaiVoice: "nova",
    lang: "en-GB",
    fallbackLangs: ["en-GB", "en-US"],
    pitch: 1.08,
    rateMultiplier: 1.0,
    sampleText:
      "Good day, Boss. FRIDAY tactical female voice matrix is online and ready.",
  },
  {
    id: "Aoede",
    label: "Aoede — Nova Expressive Female",
    urduLabel: "ایوڈ — نووا زنانہ آواز (خاتون)",
    gender: "female",
    accent: "Expressive Silk Female",
    geminiVoice: "Aoede",
    openaiVoice: "shimmer",
    lang: "en-US",
    fallbackLangs: ["en-US", "en-GB"],
    pitch: 1.15,
    rateMultiplier: 1.02,
    sampleText:
      "All neural subsystems are synchronized, Sir. Nova female voice is active.",
  },
  {
    id: "Zephyr",
    label: "Zephyr — Aura Calm Female",
    urduLabel: "زیفر — پرسکون زنانہ آواز (خاتون)",
    gender: "female",
    accent: "Smooth Conversational Female",
    geminiVoice: "Zephyr",
    openaiVoice: "shimmer",
    lang: "en-US",
    fallbackLangs: ["en-US", "en-IN"],
    pitch: 1.05,
    rateMultiplier: 0.98,
    sampleText:
      "Systems are calm and operating at peak efficiency. How can I help you today?",
  },
];

export function normalizeVoiceId(voiceName?: string): JarvisVoiceId {
  if (!voiceName) return "UrduMale_Asad";
  const exact = JARVIS_VOICE_PROFILES.find((v) => v.id === voiceName);
  if (exact) return exact.id;

  const lower = String(voiceName).trim().toLowerCase();
  const byIdCaseInsensitive = JARVIS_VOICE_PROFILES.find(
    (v) => v.id.toLowerCase() === lower
  );
  if (byIdCaseInsensitive) return byIdCaseInsensitive.id;

  if (lower.includes("farhan") || (lower.includes("deep") && lower.includes("urdu"))) {
    return "UrduMale_Farhan";
  }
  if (lower.includes("zoya") || (lower.includes("urdu") && lower.includes("female")) || lower.includes("zanana") || lower.includes("خاتون") || lower.includes("زنانہ")) {
    return "UrduFemale_Zoya";
  }
  if (lower.includes("kore") || lower.includes("friday")) return "Kore";
  if (lower.includes("aoede") || lower.includes("nova")) return "Aoede";
  if (lower.includes("zephyr") || lower.includes("aura")) return "Zephyr";
  if (lower === "female" || lower.includes("female") || lower.includes("woman") || lower.includes("girl")) {
    return "UrduFemale_Zoya";
  }
  if (lower.includes("fenrir") || lower.includes("british")) return "Fenrir";
  if (lower.includes("charon")) return "Charon";
  if (lower.includes("orus") || lower.includes("titan")) return "Orus";
  if (lower.includes("puck")) return "Puck";
  if (lower === "male" || lower.includes("male") || lower.includes("mardana") || lower.includes("asad") || lower.includes("مرد")) {
    return "UrduMale_Asad";
  }
  return "UrduMale_Asad";
}

export function getVoiceProfile(voiceName?: string): JarvisVoiceProfile {
  const resolvedId = normalizeVoiceId(voiceName);
  return (
    JARVIS_VOICE_PROFILES.find((v) => v.id === resolvedId) ||
    JARVIS_VOICE_PROFILES[0]
  );
}

export interface JarvisConfig {
  assistantName: string;
  modelVersion: string;
  userTitle: string;
  userName: string;
  voiceName: JarvisVoiceId;
  languageMode: string;
  wakeWordEnabled: boolean;
  wakeWord: string;
  proactiveMode: boolean;
  confirmDestructive: boolean;
  autoSpeak: boolean;
  autoMicOpen: boolean;
  autoReply: boolean;
  avatarMode: "face_mesh" | "arc_core";
  hudAccent: "cyan" | "amber" | "emerald";
  volume: number;
  brightness: number;
  micGain: number;
  ttsSpeed: number;
  noiseFloorDb: number;
  lastCalibratedAt?: string;
  bluetooth: boolean;
  wifi: boolean;
  doNotDisturb: boolean;
}

export interface JarvisMemory {
  id: string;
  category: "identity" | "preference" | "project" | "note";
  content: string;
  confidence: number;
  createdAt: string;
}

export interface JarvisReminder {
  id: string;
  title: string;
  dueAt: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  createdAt: string;
}

export interface JarvisFile {
  id: string;
  name: string;
  type: "code" | "text" | "markdown";
  size: number;
  updatedAt: string;
  content: string;
}

export interface JarvisPlugin {
  id: string;
  name: string;
  title: string;
  version: string;
  description: string;
  enabled: boolean;
  triggerWords: string[];
  code: string;
}

export interface JarvisUndoItem {
  id: string;
  description: string;
  type: string;
  timestamp: string;
}

export interface JarvisActionLog {
  id: string;
  timestamp: string;
  module: string;
  action: string;
  status: "completed" | "pending" | "error";
  summary: string;
  data?: any;
}

export type AIProviderId = "gemini" | "openai" | "groq" | "custom";

export interface AIProviderConfig {
  id: AIProviderId;
  name: string;
  enabled: boolean;
  allowFallbackUse: boolean;
  model: string;
  customModel?: string;
  baseUrl?: string;
  apiKeyConfigured: boolean;
  maskedKey?: string;
  usingEnvironmentKey?: boolean;
  status: "connected" | "ready" | "untested" | "error" | "disabled" | "rate_limited";
  lastTestedAt?: string;
  lastLatencyMs?: number;
  lastError?: string;
}

export interface AIProviderManagerSettings {
  defaultProvider: AIProviderId;
  automaticFallback: boolean;
  providerPriority: AIProviderId[];
  requestTimeoutMs: number;
  maxRetriesPerProvider: number;
  activeProvider: AIProviderId;
  activeModel: string;
  providers: Record<AIProviderId, AIProviderConfig>;
}

export interface ProviderAttemptLog {
  providerId: AIProviderId;
  model: string;
  status: "success" | "failed" | "skipped";
  reason?: string;
  latencyMs?: number;
}

export interface JarvisMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  moduleUsed?: string;
  providerUsed?: AIProviderId | "local_fallback";
  modelUsed?: string;
  fallbackNotice?: string;
  providerAttempts?: ProviderAttemptLog[];
  attachments?: Array<{
    toolName: string;
    type: string;
    data: any;
  }>;
  citations?: Array<{
    title: string;
    uri: string;
  }>;
}

export interface SystemTelemetry {
  cpuPercent: number;
  cpuModel: string;
  cores: number;
  memoryPercent: number;
  memoryUsedGb: number;
  memoryTotalGb: number;
  uptimeHours: number;
  platform: string;
  activeModules: number;
  activePlugins: number;
}

export interface JarvisAppState {
  config: JarvisConfig;
  providerSettings: AIProviderManagerSettings;
  memories: JarvisMemory[];
  reminders: JarvisReminder[];
  files: JarvisFile[];
  plugins: JarvisPlugin[];
  undoStack: JarvisUndoItem[];
  actionLogs: JarvisActionLog[];
  messages: JarvisMessage[];
  systemTelemetry: SystemTelemetry;
}

export interface ActionModuleCatalogItem {
  id: string;
  file: string;
  name: string;
  category: "Intelligence" | "System & OS" | "Developer & Files" | "Media & Comms";
  description: string;
  samplePrompt: string;
  SampleRomanUrduPrompt: string;
}

export const MARK_LV_ACTION_MODULES: ActionModuleCatalogItem[] = [
  {
    id: "weather_report",
    file: "actions/weather_report.py",
    name: "Weather Telemetry",
    category: "Intelligence",
    description: "Fetches live meteorological conditions, wind vectors, and 5-day forecast for any city.",
    samplePrompt: "Jarvis, give me a complete weather report for Karachi and Lahore.",
    SampleRomanUrduPrompt: "Jarvis, Karachi aur Islamabad ka mausam kaisa hai?",
  },
  {
    id: "web_search",
    file: "actions/web_search.py",
    name: "Grounded Web Search",
    category: "Intelligence",
    description: "Queries live Google Search grounding with verified source citations.",
    samplePrompt: "Jarvis, search the web for the latest space mission news today.",
    SampleRomanUrduPrompt: "Jarvis, web search karke aaj ki latest tech news batao.",
  },
  {
    id: "flight_finder",
    file: "actions/flight_finder.py",
    name: "Flight Route Finder",
    category: "Intelligence",
    description: "Scans direct flight corridors, cabin classes, and fare estimates between airports.",
    samplePrompt: "Jarvis, find Business class flights from Karachi (KHI) to Dubai (DXB).",
    SampleRomanUrduPrompt: "Jarvis, Lahore se Dubai ki flights check karo.",
  },
  {
    id: "screen_processor",
    file: "actions/screen_processor.py",
    name: "Screen & Vision Processor",
    category: "Intelligence",
    description: "Captures display frames, webcam feed, or uploaded screenshots for Gemini visual analysis.",
    samplePrompt: "Analyze my current screen capture and summarize the key elements.",
    SampleRomanUrduPrompt: "Jarvis, meri screen dekh kar batao isme kya likha hai.",
  },
  {
    id: "proactive",
    file: "actions/proactive.py",
    name: "Proactive Intelligence",
    category: "Intelligence",
    description: "Monitors reminders, CPU load, and user habits to offer timely recommendations.",
    samplePrompt: "Jarvis, run a proactive briefing on my upcoming tasks and system health.",
    SampleRomanUrduPrompt: "Jarvis, aaj ke mere pending kaam aur system status ki briefing do.",
  },
  {
    id: "code_helper",
    file: "actions/code_helper.py",
    name: "Code Helper",
    category: "Developer & Files",
    description: "Synthesizes, refactors, and explains Python, TypeScript, and shell scripts.",
    samplePrompt: "Jarvis, write a Python script for an async port scanner and save it.",
    SampleRomanUrduPrompt: "Jarvis, Python mein ek fast file organizer script likh do.",
  },
  {
    id: "dev_agent",
    file: "actions/dev_agent.py",
    name: "Autonomous Dev Agent",
    category: "Developer & Files",
    description: "Multi-step software engineering agent that scaffolds modules into the workspace.",
    samplePrompt: "Jarvis, use Dev Agent to build a FastAPI microservice template.",
    SampleRomanUrduPrompt: "Jarvis, Dev Agent se ek REST API ka code तैयार (ready) karo.",
  },
  {
    id: "file_controller",
    file: "actions/file_controller.py",
    name: "File Controller",
    category: "Developer & Files",
    description: "Creates, modifies, organizes, and deletes files with undo & confirmation protection.",
    samplePrompt: "Jarvis, create a new file notes/architecture.md with Mark-LV specs.",
    SampleRomanUrduPrompt: "Jarvis, notes/todo.md ke naam se ek nayi file bana do.",
  },
  {
    id: "file_processor",
    file: "actions/file_processor.py",
    name: "Document & File Processor",
    category: "Developer & Files",
    description: "Reads, summarizes, and extracts structured insights from workspace files.",
    samplePrompt: "Jarvis, read and summarize core/prompt.txt for me.",
    SampleRomanUrduPrompt: "Jarvis, core/prompt.txt file parh kar uska khulasa batao.",
  },
  {
    id: "computer_settings",
    file: "actions/computer_settings.py",
    name: "Computer & HUD Settings",
    category: "System & OS",
    description: "Controls audio volume, display brightness, HUD theme color, Wi-Fi, and DND state.",
    samplePrompt: "Jarvis, set system volume to 70 and switch HUD theme to amber.",
    SampleRomanUrduPrompt: "Jarvis, volume 70 par kar do aur HUD color amber kar do.",
  },
  {
    id: "computer_control",
    file: "actions/computer_control.py",
    name: "Computer Control",
    category: "System & OS",
    description: "Executes workstation lock, sleep simulation, clipboard sync, and shortcut macros.",
    samplePrompt: "Jarvis, enable Do Not Disturb mode and optimize workstation focus.",
    SampleRomanUrduPrompt: "Jarvis, Do Not Disturb on kar do.",
  },
  {
    id: "system_monitor",
    file: "actions/system_monitor.py",
    name: "System Telemetry Monitor",
    category: "System & OS",
    description: "Real-time CPU load, RAM allocation, core count, and host OS uptime diagnostics.",
    samplePrompt: "Jarvis, run a full system diagnostic on CPU and memory usage.",
    SampleRomanUrduPrompt: "Jarvis, CPU aur RAM ka current status check karo.",
  },
  {
    id: "background_monitor",
    file: "actions/background_monitor.py",
    name: "Background Daemon Monitor",
    category: "System & OS",
    description: "Watches background worker threads, memory leaks, and scheduled cron tasks.",
    samplePrompt: "Jarvis, check all active background daemons and plugin threads.",
    SampleRomanUrduPrompt: "Jarvis, background processes check karo sab theek chal raha hai?",
  },
  {
    id: "desktop",
    file: "actions/desktop.py",
    name: "Desktop & Workspace Manager",
    category: "System & OS",
    description: "Manages virtual desktop layouts, window snapping, and clean-desk mode.",
    samplePrompt: "Jarvis, switch my workspace to 3D Face Mesh Avatar view.",
    SampleRomanUrduPrompt: "Jarvis, avatar ko 3D Face Mesh mode par set karo.",
  },
  {
    id: "open_app",
    file: "actions/open_app.py",
    name: "Application Launcher",
    category: "System & OS",
    description: "Launches local applications, IDE workspaces, or system utilities.",
    samplePrompt: "Jarvis, launch the Code Sandbox application.",
    SampleRomanUrduPrompt: "Jarvis, Code Sandbox open karo.",
  },
  {
    id: "browser_control",
    file: "actions/browser_control.py",
    name: "Browser Automation",
    category: "System & OS",
    description: "Opens URLs, manages research tabs, and extracts web page context.",
    samplePrompt: "Jarvis, open GitHub in browser control.",
    SampleRomanUrduPrompt: "Jarvis, browser mein GitHub open karo.",
  },
  {
    id: "game_updater",
    file: "actions/game_updater.py",
    name: "Game Updater & Patch Radar",
    category: "System & OS",
    description: "Checks game client manifests, shader cache status, and background patch queues.",
    samplePrompt: "Jarvis, check if any game updates or patches are pending.",
    SampleRomanUrduPrompt: "Jarvis, check karo koi game update pending toh nahi hai.",
  },
  {
    id: "reminder",
    file: "actions/reminder.py",
    name: "Reminder & Task Scheduler",
    category: "Media & Comms",
    description: "Schedules priority reminders and countdown timers with spoken JARVIS alerts.",
    samplePrompt: "Jarvis, remind me in 15 minutes to deploy the production build.",
    SampleRomanUrduPrompt: "Jarvis, 20 minute baad mujhe meeting ka reminder dena.",
  },
  {
    id: "youtube_video",
    file: "actions/youtube_video.py",
    name: "YouTube Streamer",
    category: "Media & Comms",
    description: "Searches and embeds YouTube streams directly inside the Jarvis Media HUD.",
    samplePrompt: "Jarvis, play Lofi coding beats on YouTube in the media player.",
    SampleRomanUrduPrompt: "Jarvis, YouTube par Lofi coding music chala do.",
  },
  {
    id: "video_player",
    file: "actions/video_player.py",
    name: "Media & Video Player",
    category: "Media & Comms",
    description: "Controls playback, NASA live orbital feeds, and synthwave audio streams.",
    samplePrompt: "Jarvis, stream the NASA ISS Live Earth feed in the video player.",
    SampleRomanUrduPrompt: "Jarvis, NASA live space video stream chala do.",
  },
  {
    id: "send_message",
    file: "actions/send_message.py",
    name: "Communications Dispatcher",
    category: "Media & Comms",
    description: "Drafts and dispatches messages across WhatsApp, Email, Slack, and Discord.",
    samplePrompt: "Jarvis, send a WhatsApp message to Ali saying I will join the call at 5 PM.",
    SampleRomanUrduPrompt: "Jarvis, Ali ko WhatsApp message bhejo ke main 5 baje call join karunga.",
  },
];
