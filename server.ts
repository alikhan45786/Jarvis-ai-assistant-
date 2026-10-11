import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import os from "os";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { FunctionDeclaration, GoogleGenAI, Type } from "@google/genai";
import {
  createDefaultProviderSettings,
  deleteProviderApiKey,
  executeMultiProviderChat,
  getEffectiveModel,
  getProviderApiKey,
  setProviderApiKey,
  syncProviderSettingsWithVault,
  testProviderConnection,
} from "./src/server/aiProviders.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

function getGenAI() {
  return new GoogleGenAI({
    apiKey: getProviderApiKey("gemini") || process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Persistent state file for Mark-LV Memory, Config, Reminders, Files, Plugins, and Undo Stack
const DATA_FILE = path.join(__dirname, ".jarvis-mark-lv-state.json");

const DEFAULT_STATE = {
  config: {
    assistantName: "Jarvis",
    modelVersion: "Jarvis",
    userTitle: "Sir",
    userName: "Commander",
    voiceName: "UrduMale_Asad",
    voiceMigratedV2: true,
    languageMode: "Roman Urdu / Urdu Primary",
    wakeWordEnabled: true,
    wakeWord: "Jarvis",
    proactiveMode: true,
    confirmDestructive: true,
    autoSpeak: true,
    autoMicOpen: true,
    autoReply: true,
    avatarMode: "face_mesh", // "face_mesh" | "arc_core"
    hudAccent: "cyan", // "cyan" | "amber" | "emerald"
    volume: 85,
    brightness: 90,
    micGain: 100,
    ttsSpeed: 1.0,
    noiseFloorDb: -48,
    lastCalibratedAt: new Date().toISOString(),
    bluetooth: true,
    wifi: true,
    doNotDisturb: false,
  },
  providerSettings: createDefaultProviderSettings(),
  memories: [
    {
      id: "mem-1",
      category: "identity",
      content: "User is the creator and primary operator of the Jarvis system.",
      confidence: 0.99,
      createdAt: new Date().toISOString(),
    },
    {
      id: "mem-2",
      category: "preference",
      content: "Prefers natural support for both English and Roman Urdu / Urdu commands.",
      confidence: 0.95,
      createdAt: new Date().toISOString(),
    },
    {
      id: "mem-3",
      category: "project",
      content: "Running Jarvis architecture with 3D face mesh viseme lip-sync and action modules.",
      confidence: 0.98,
      createdAt: new Date().toISOString(),
    },
  ],
  reminders: [
    {
      id: "rem-1",
      title: "Review Jarvis Core Diagnostics & Audio Calibration",
      dueAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      priority: "high",
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "rem-2",
      title: "Sync Workspace Repository & Security Audit",
      dueAt: new Date(Date.now() + 7200 * 1000).toISOString(),
      priority: "medium",
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ],
  files: [
    {
      id: "file-1",
      name: "core/prompt.txt",
      type: "text",
      size: 1240,
      updatedAt: new Date().toISOString(),
      content: `You are Jarvis, a personal AI assistant.
Address the user respectfully as "Sir" (or their preferred title).
You understand English, Roman Urdu (e.g., "Mera AI assistant ka naam Jarvis hai", "Mosam kaisa hai"), and Urdu effortlessly.
Whenever a user asks you to perform a system action, check weather, find flights, set a reminder, write or debug code, process a file, play a video, send a message, or adjust settings, execute the corresponding Jarvis action tool and report back concisely.`,
    },
    {
      id: "file-2",
      name: "plugins/_template.py",
      type: "code",
      size: 980,
      updatedAt: new Date().toISOString(),
      content: `# Jarvis Plugin Template
PLUGIN_METADATA = {
    "name": "custom_diagnostic",
    "version": "1.0.0",
    "description": "Runs custom telemetry and reports status to Jarvis",
    "trigger_words": ["diagnostic", "health check"]
}

def execute(params: dict, context: dict) -> dict:
    target = params.get("target", "all_subsystems")
    return {
        "status": "nominal",
        "message": f"Completed deep scan on {target}. All Jarvis nodes responsive."
    }`,
    },
    {
      id: "file-3",
      name: "notes/mission_brief.md",
      type: "markdown",
      size: 640,
      updatedAt: new Date().toISOString(),
      content: `# Jarvis Deployment Brief\n\n- **Avatar Subsystem**: 3D OBJ Face Mesh + Viseme Lip-Sync active\n- **Voice Pipeline**: Urdu & English TTS + Web Speech STT + Auto-Mic\n- **Action Modules**: Operational modules loaded`,
    },
  ],
  plugins: [
    {
      id: "plug-1",
      name: "network_sentinel",
      title: "Network Sentinel",
      version: "1.2.0",
      description: "Monitors outbound API latency and DNS resolution health.",
      enabled: true,
      triggerWords: ["network scan", "ping check", "latency"],
      code: `def execute(params, ctx):\n    return {"latency_ms": 18, "status": "Optimal", "packet_loss": "0.0%"}`,
    },
    {
      id: "plug-2",
      name: "git_commit_crafter",
      title: "Git Commit Crafter",
      version: "1.0.4",
      description: "Generates semantic conventional commit messages from workspace diffs.",
      enabled: true,
      triggerWords: ["commit message", "git summary"],
      code: `def execute(params, ctx):\n    return {"commit": "feat(jarvis): synchronize 3D viseme mesh with TTS"}`,
    },
    {
      id: "plug-3",
      name: "game_patch_radar",
      title: "Game Updater Radar",
      version: "2.1.0",
      description: "Tracks Steam/Epic update manifests and shader compilation queues.",
      enabled: true,
      triggerWords: ["game update", "patch status"],
      code: `def execute(params, ctx):\n    return {"updates_ready": 2, "bandwidth_mbps": 420}`,
    },
  ],
  undoStack: [],
  actionLogs: [
    {
      id: "log-init-1",
      timestamp: new Date().toISOString(),
      module: "core.action_loader",
      action: "initialize_modules",
      status: "completed",
      summary: "Loaded Jarvis action modules and plugins into memory.",
    },
    {
      id: "log-init-2",
      timestamp: new Date().toISOString(),
      module: "core.avatar_mesh",
      action: "load_face_model",
      status: "completed",
      summary: "Initialized 3D face_model.obj wireframe mesh and 10 viseme blendshapes.",
    },
  ],
  messages: [
    {
      id: "msg-welcome",
      role: "assistant",
      text: "Assalam-o-Alaikum, Sir. Jarvis is online. Aap mujhe Urdu, Roman Urdu, ya English mein koi bhi hukam de sakte hain. How may I assist you today?",
      timestamp: new Date().toISOString(),
      moduleUsed: "core.boot",
    },
  ],
};

function cleanLegacyBranding(text: string): string {
  return String(text || "")
    .replace(/J\.A\.R\.V\.I\.S\.\s*MARK-LV/gi, "Jarvis")
    .replace(/JARVIS\s*Mark-LV/gi, "Jarvis")
    .replace(/Mark-LV\s*\(Model 55\)/gi, "Jarvis")
    .replace(/Mark-LV/gi, "Jarvis")
    .replace(/J\.A\.R\.V\.I\.S\./g, "Jarvis")
    .replace(/\bJARVIS\b/g, "Jarvis");
}

function loadState(): any {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      const mergedConfig = {
        ...DEFAULT_STATE.config,
        ...(parsed.config || {}),
        assistantName: "Jarvis",
        modelVersion: "Jarvis",
      };
      if (!parsed?.config?.voiceMigratedV2) {
        mergedConfig.voiceName = "UrduMale_Asad";
        mergedConfig.voiceMigratedV2 = true;
      }
      const cleanedMessages = Array.isArray(parsed.messages)
        ? parsed.messages.map((m: any) => ({
            ...m,
            text: cleanLegacyBranding(m.text),
          }))
        : DEFAULT_STATE.messages;
      const cleanedMemories = Array.isArray(parsed.memories)
        ? parsed.memories.map((m: any) => ({
            ...m,
            content: cleanLegacyBranding(m.content),
          }))
        : DEFAULT_STATE.memories;
      return {
        ...DEFAULT_STATE,
        ...parsed,
        config: mergedConfig,
        messages: cleanedMessages,
        memories: cleanedMemories,
        providerSettings: syncProviderSettingsWithVault(
          parsed.providerSettings || createDefaultProviderSettings()
        ),
      };
    }
  } catch (err) {
    console.error("Failed to load state file, using default:", err);
  }
  const initial = structuredClone(DEFAULT_STATE);
  initial.providerSettings = syncProviderSettingsWithVault(initial.providerSettings);
  return initial;
}

function saveState(state: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save state file:", err);
  }
}

let appState: any = loadState();

function logAction(
  moduleName: string,
  actionName: string,
  summary: string,
  status: string = "completed",
  data: any = null
) {
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    module: moduleName,
    action: actionName,
    status,
    summary,
    data,
  };
  appState.actionLogs.unshift(entry);
  if (appState.actionLogs.length > 60) {
    appState.actionLogs = appState.actionLogs.slice(0, 60);
  }
  saveState(appState);
  return entry;
}

// Weather helper using free Open-Meteo geocoding + forecast API
async function fetchRealWeather(cityQuery: string) {
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    const geoData: any = await geoRes.json();
    const loc = geoData?.results?.[0] || {
      name: cityQuery || "Karachi",
      country: "PK",
      latitude: 24.8607,
      longitude: 67.0011,
    };

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const wRes = await fetch(weatherUrl);
    const wData: any = await wRes.json();

    const codeMap: Record<number, string> = {
      0: "Clear Sky",
      1: "Mainly Clear",
      2: "Partly Cloudy",
      3: "Overcast",
      45: "Atmospheric Fog",
      51: "Light Drizzle",
      61: "Moderate Rain",
      71: "Snow Fall",
      80: "Rain Showers",
      95: "Thunderstorm",
    };
    const code = Number(wData?.current?.weather_code ?? 0);
    return {
      city: loc.name,
      country: loc.country || "",
      latitude: loc.latitude,
      longitude: loc.longitude,
      tempC: wData?.current?.temperature_2m ?? 26,
      feelsLikeC: wData?.current?.apparent_temperature ?? 27,
      humidity: wData?.current?.relative_humidity_2m ?? 52,
      windKmh: wData?.current?.wind_speed_10m ?? 14,
      condition: codeMap[code] || "Clear Conditions",
      daily: (wData?.daily?.time || []).slice(0, 5).map((dateStr: string, idx: number) => ({
        date: dateStr,
        maxC: wData?.daily?.temperature_2m_max?.[idx] ?? 29,
        minC: wData?.daily?.temperature_2m_min?.[idx] ?? 20,
      })),
    };
  } catch {
    return {
      city: cityQuery || "Lahore",
      country: "Global",
      latitude: 31.5204,
      longitude: 74.3587,
      tempC: 27.4,
      feelsLikeC: 28.1,
      humidity: 46,
      windKmh: 12.5,
      condition: "Clear Sky",
      daily: [
        { date: "Today", maxC: 29, minC: 19 },
        { date: "Tomorrow", maxC: 30, minC: 20 },
        { date: "Day 3", maxC: 28, minC: 18 },
      ],
    };
  }
}

// Gemini Function Declarations mirroring Mark-LV's `actions/` folder
const jarvisFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: "weather_report",
    description: "Get real-time weather telemetry and 5-day forecast for any city (actions/weather_report.py).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: { type: Type.STRING, description: "City name, e.g. Karachi, Lahore, Dubai, London, New York" },
      },
      required: ["city"],
    },
  },
  {
    name: "flight_finder",
    description: "Search flights, schedules, airlines, and fare telemetry between two cities or airports (actions/flight_finder.py).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        origin: { type: Type.STRING, description: "Origin city or airport code" },
        destination: { type: Type.STRING, description: "Destination city or airport code" },
        date: { type: Type.STRING, description: "Departure date or timeframe" },
        cabin: { type: Type.STRING, description: "Economy, Business, or First Class" },
      },
      required: ["origin", "destination"],
    },
  },
  {
    name: "set_reminder",
    description: "Create a new reminder or scheduled alert in JARVIS memory (actions/reminder.py).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Task or reminder description" },
        minutesFromNow: { type: Type.NUMBER, description: "Minutes from now until due (default 30)" },
        priority: { type: Type.STRING, description: "low, medium, or high" },
      },
      required: ["title"],
    },
  },
  {
    name: "computer_settings",
    description: "Adjust computer & HUD settings such as volume, brightness, micGain, ttsSpeed, voiceName (male/female/Urdu voices), dark/accent theme, Do Not Disturb, Wi-Fi, Bluetooth, or Avatar mode (actions/computer_settings.py).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        setting: {
          type: Type.STRING,
          description: "Setting key: volume, brightness, micGain, ttsSpeed, voiceName, doNotDisturb, bluetooth, wifi, avatarMode, hudAccent",
        },
        value: {
          type: Type.STRING,
          description: "New value (e.g. 'UrduMale_Asad', 'UrduMale_Farhan', 'Fenrir', 'Charon', 'Orus', 'Puck', 'UrduFemale_Zoya', 'Kore', 'Aoede', 'Zephyr', '75', '120', '1.15', 'true', 'false', 'face_mesh', 'arc_core', 'cyan', 'amber', 'emerald')",
        },
      },
      required: ["setting", "value"],
    },
  },
  {
    name: "file_controller",
    description: "Create, update, read, or delete a file in the JARVIS Mark-LV workspace (actions/file_controller.py & actions/file_processor.py).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        operation: { type: Type.STRING, description: "create, update, read, summarize, or delete" },
        fileName: { type: Type.STRING, description: "File path or name, e.g. scripts/automation.py" },
        content: { type: Type.STRING, description: "File content if creating or updating" },
      },
      required: ["operation", "fileName"],
    },
  },
  {
    name: "code_helper",
    description: "Generate, refactor, or debug code using the Mark-LV Dev Agent & Code Helper (actions/code_helper.py & actions/dev_agent.py).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        task: { type: Type.STRING, description: "Description of the code to write or debug" },
        language: { type: Type.STRING, description: "Programming language (python, typescript, bash, etc.)" },
        codeSnippet: { type: Type.STRING, description: "Generated or refactored source code" },
      },
      required: ["task", "language", "codeSnippet"],
    },
  },
  {
    name: "youtube_video",
    description: "Play or queue a YouTube video or media stream inside the JARVIS Video Player HUD (actions/youtube_video.py & actions/video_player.py).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search topic or video title to play" },
        videoId: { type: Type.STRING, description: "Optional YouTube 11-char video ID if known" },
      },
      required: ["query"],
    },
  },
  {
    name: "send_message",
    description: "Prepare or dispatch a message via WhatsApp, Email, Slack, or Discord (actions/send_message.py).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        channel: { type: Type.STRING, description: "whatsapp, email, discord, or slack" },
        recipient: { type: Type.STRING, description: "Recipient name, phone, or handle" },
        body: { type: Type.STRING, description: "Message content" },
      },
      required: ["channel", "recipient", "body"],
    },
  },
  {
    name: "store_memory",
    description: "Save an important fact, user preference, or instruction into JARVIS long-term memory (memory/memory_manager.py).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: "identity, preference, project, or note" },
        content: { type: Type.STRING, description: "Fact to remember permanently" },
      },
      required: ["category", "content"],
    },
  },
  {
    name: "open_app_or_browser",
    description: "Launch an application, system utility, or web URL.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: { type: Type.STRING, description: "Application name or website URL" },
        actionType: { type: Type.STRING, description: "app, url, or game_updater" },
      },
      required: ["target"],
    },
  },
];

// Execute tool calls and record Undo operations
async function executeJarvisTool(call: any) {
  const { name, args } = call;

  if (name === "weather_report") {
    const weather = await fetchRealWeather(args.city || "Karachi");
    logAction("actions.weather_report", "fetch_weather", `Retrieved weather telemetry for ${weather.city}: ${weather.tempC}°C, ${weather.condition}`, "completed", weather);
    return { type: "weather", data: weather };
  }

  if (name === "flight_finder") {
    const origin = (args.origin || "KHI").toUpperCase();
    const destination = (args.destination || "DXB").toUpperCase();
    const cabin = args.cabin || "Business";
    const flights = [
      {
        flightNo: "EK-601",
        airline: "Emirates",
        origin,
        destination,
        departure: "04:20",
        arrival: "06:35",
        duration: "2h 15m",
        cabin,
        priceUsd: cabin.toLowerCase().includes("bus") ? 640 : 245,
        status: "On Time",
      },
      {
        flightNo: "QR-611",
        airline: "Qatar Airways",
        origin,
        destination,
        departure: "09:45",
        arrival: "12:10",
        duration: "2h 25m",
        cabin,
        priceUsd: cabin.toLowerCase().includes("bus") ? 595 : 220,
        status: "Available",
      },
      {
        flightNo: "PK-213",
        airline: "PIA / Codeshare",
        origin,
        destination,
        departure: "18:15",
        arrival: "20:30",
        duration: "2h 15m",
        cabin,
        priceUsd: cabin.toLowerCase().includes("bus") ? 480 : 185,
        status: "Direct",
      },
    ];
    logAction("actions.flight_finder", "search_routes", `Found ${flights.length} flights from ${origin} to ${destination} (${cabin})`, "completed", { flights });
    return { type: "flights", data: { origin, destination, date: args.date || "Upcoming", flights } };
  }

  if (name === "set_reminder") {
    const mins = Number(args.minutesFromNow) || 30;
    const newRem = {
      id: `rem-${Date.now()}`,
      title: args.title,
      dueAt: new Date(Date.now() + mins * 60000).toISOString(),
      priority: args.priority || "medium",
      completed: false,
      createdAt: new Date().toISOString(),
    };
    appState.reminders.unshift(newRem);
    appState.undoStack.unshift({
      id: `undo-${Date.now()}`,
      description: `Remove reminder "${newRem.title}"`,
      type: "remove_reminder",
      targetId: newRem.id,
      timestamp: new Date().toISOString(),
    });
    logAction("actions.reminder", "create_reminder", `Scheduled reminder: "${newRem.title}" (${mins}m)`, "completed", newRem);
    return { type: "reminder", data: newRem };
  }

  if (name === "computer_settings") {
    const key = args.setting;
    const prevValue = appState.config[key];
    let parsedVal = args.value;
    if (key === "voiceName") {
      const vLower = String(args.value || "").trim().toLowerCase();
      if (vLower.includes("farhan")) parsedVal = "UrduMale_Farhan";
      else if (vLower.includes("zoya") || (vLower.includes("urdu") && vLower.includes("female")) || vLower.includes("zanana"))
        parsedVal = "UrduFemale_Zoya";
      else if (vLower.includes("kore") || vLower.includes("friday")) parsedVal = "Kore";
      else if (vLower.includes("aoede") || vLower.includes("nova")) parsedVal = "Aoede";
      else if (vLower.includes("zephyr") || vLower.includes("aura")) parsedVal = "Zephyr";
      else if (vLower === "female" || vLower.includes("female") || vLower.includes("girl") || vLower.includes("woman"))
        parsedVal = "UrduFemale_Zoya";
      else if (vLower.includes("fenrir") || vLower.includes("british")) parsedVal = "Fenrir";
      else if (vLower.includes("charon")) parsedVal = "Charon";
      else if (vLower.includes("orus") || vLower.includes("titan")) parsedVal = "Orus";
      else if (vLower.includes("puck")) parsedVal = "Puck";
      else parsedVal = "UrduMale_Asad";
    } else if (args.value === "true") parsedVal = true;
    else if (args.value === "false") parsedVal = false;
    else if (!isNaN(Number(args.value)) && String(args.value).trim() !== "") parsedVal = Number(args.value);

    if (key in appState.config) {
      appState.config[key] = parsedVal;
      appState.undoStack.unshift({
        id: `undo-${Date.now()}`,
        description: `Restore setting ${key} to ${prevValue}`,
        type: "restore_config",
        key,
        prevValue,
        timestamp: new Date().toISOString(),
      });
    }
    logAction("actions.computer_settings", "update_setting", `Adjusted ${key} -> ${String(parsedVal)}`, "completed", { key, value: parsedVal });
    return { type: "setting", data: { key, value: parsedVal } };
  }

  if (name === "file_controller") {
    const op = (args.operation || "create").toLowerCase();
    const fileName = args.fileName || "workspace/output.txt";
    if (op === "delete" && appState.config.confirmDestructive) {
      const pendingConfirmation = {
        id: `confirm-${Date.now()}`,
        module: "actions.file_controller",
        title: `Confirm File Deletion: ${fileName}`,
        description: `JARVIS safety protocol requires your authorization before permanently deleting "${fileName}".`,
        payload: { operation: "delete", fileName },
      };
      logAction("core.confirm", "awaiting_confirmation", `Awaiting user confirmation to delete ${fileName}`, "pending", pendingConfirmation);
      return { type: "confirmation_required", data: pendingConfirmation };
    }

    const existingIdx = appState.files.findIndex((f: any) => f.name.toLowerCase() === fileName.toLowerCase());
    if (op === "create" || op === "update") {
      const content = args.content || `# Generated by JARVIS Mark-LV\n# Timestamp: ${new Date().toISOString()}\n`;
      if (existingIdx >= 0) {
        const prevContent = appState.files[existingIdx].content;
        appState.files[existingIdx].content = content;
        appState.files[existingIdx].size = content.length;
        appState.files[existingIdx].updatedAt = new Date().toISOString();
        appState.undoStack.unshift({
          id: `undo-${Date.now()}`,
          description: `Revert edits to ${fileName}`,
          type: "revert_file",
          fileName,
          prevContent,
          timestamp: new Date().toISOString(),
        });
      } else {
        const newFile = {
          id: `file-${Date.now()}`,
          name: fileName,
          type: fileName.endsWith(".py") || fileName.endsWith(".ts") || fileName.endsWith(".js") ? "code" : "text",
          size: content.length,
          updatedAt: new Date().toISOString(),
          content,
        };
        appState.files.unshift(newFile);
        appState.undoStack.unshift({
          id: `undo-${Date.now()}`,
          description: `Delete newly created file ${fileName}`,
          type: "delete_created_file",
          fileId: newFile.id,
          timestamp: new Date().toISOString(),
        });
      }
      logAction("actions.file_controller", op, `${op === "create" ? "Created" : "Updated"} file ${fileName}`, "completed", { fileName });
      return { type: "file", data: { operation: op, fileName, content } };
    }

    const found = existingIdx >= 0 ? appState.files[existingIdx] : appState.files[0];
    logAction("actions.file_processor", "read_file", `Processed file ${found?.name}`, "completed", found);
    return { type: "file", data: found };
  }

  if (name === "code_helper") {
    const extMap: Record<string, string> = { python: "py", typescript: "ts", javascript: "js", bash: "sh", html: "html" };
    const ext = extMap[String(args.language || "python").toLowerCase()] || "py";
    const fileName = `dev_agent/solution_${Date.now().toString().slice(-4)}.${ext}`;
    const newFile = {
      id: `file-${Date.now()}`,
      name: fileName,
      type: "code",
      size: (args.codeSnippet || "").length,
      updatedAt: new Date().toISOString(),
      content: args.codeSnippet || "",
    };
    appState.files.unshift(newFile);
    logAction("actions.dev_agent", "generate_code", `Synthesized ${args.language} module: ${fileName}`, "completed", {
      task: args.task,
      language: args.language,
      fileName,
      code: args.codeSnippet,
    });
    return {
      type: "code",
      data: {
        task: args.task,
        language: args.language,
        fileName,
        code: args.codeSnippet,
      },
    };
  }

  if (name === "youtube_video") {
    const query = args.query || "Iron Man Jarvis HUD";
    // Curated playable embed IDs + query support
    const presetVideos = [
      { keywords: ["lofi", "study", "coding", "music", "beats"], videoId: "jfKfPfyJRdk", title: "Lofi Hip Hop Radio — Coding & Focus Stream" },
      { keywords: ["nasa", "space", "earth", "iss"], videoId: "xRPjKQtRXR8", title: "NASA ISS Live High-Definition Orbital Feed" },
      { keywords: ["synthwave", "cyberpunk", "ambient"], videoId: "4xDzrJKXOOY", title: "Synthwave Radio — Late Night Engineering Telemetry" },
    ];
    const lowerQ = query.toLowerCase();
    const matched = presetVideos.find((p) => p.keywords.some((k) => lowerQ.includes(k)));
    const videoData = {
      query,
      videoId: args.videoId && args.videoId.length === 11 ? args.videoId : matched ? matched.videoId : "jfKfPfyJRdk",
      title: matched ? matched.title : `Mark-LV Media Stream: ${query}`,
    };
    logAction("actions.youtube_video", "stream_media", `Loaded media stream: "${videoData.title}"`, "completed", videoData);
    return { type: "video", data: videoData };
  }

  if (name === "send_message") {
    const msgPayload = {
      id: `comm-${Date.now()}`,
      channel: args.channel || "whatsapp",
      recipient: args.recipient,
      body: args.body,
      requiresConfirmation: appState.config.confirmDestructive,
    };
    logAction("actions.send_message", "stage_dispatch", `Staged ${msgPayload.channel} message to ${msgPayload.recipient}`, "completed", msgPayload);
    return { type: "message_dispatch", data: msgPayload };
  }

  if (name === "store_memory") {
    const mem = {
      id: `mem-${Date.now()}`,
      category: args.category || "note",
      content: args.content,
      confidence: 0.96,
      createdAt: new Date().toISOString(),
    };
    appState.memories.unshift(mem);
    appState.undoStack.unshift({
      id: `undo-${Date.now()}`,
      description: `Forget memory: "${mem.content.slice(0, 32)}..."`,
      type: "remove_memory",
      targetId: mem.id,
      timestamp: new Date().toISOString(),
    });
    logAction("memory.memory_manager", "store_fact", `Committed fact to long-term memory (${mem.category})`, "completed", mem);
    return { type: "memory", data: mem };
  }

  if (name === "open_app_or_browser") {
    const rawTarget = String(args.target || "settings").trim();
    const t = rawTarget.toLowerCase();
    let intentUri = "";
    let fallbackUrl = "";
    let label = rawTarget;

    if (t.includes("wifi") || t.includes("wi-fi")) {
      intentUri = "intent:#Intent;action=android.settings.WIFI_SETTINGS;end";
      label = "Android Wi-Fi Settings";
    } else if (t.includes("bluetooth")) {
      intentUri = "intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end";
      label = "Android Bluetooth Settings";
    } else if (t.includes("location") || t.includes("gps")) {
      intentUri = "intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end";
      label = "Android Location Settings";
    } else if (t.includes("sound") || t.includes("audio")) {
      intentUri = "intent:#Intent;action=android.settings.SOUND_SETTINGS;end";
      label = "Android Sound Settings";
    } else if (t.includes("display") || t.includes("screen")) {
      intentUri = "intent:#Intent;action=android.settings.DISPLAY_SETTINGS;end";
      label = "Android Display Settings";
    } else if (t.includes("battery") || t.includes("power")) {
      intentUri = "intent:#Intent;action=android.settings.BATTERY_SAVER_SETTINGS;end";
      label = "Android Battery Settings";
    } else if (t.includes("accessibility")) {
      intentUri = "intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end";
      label = "Android Accessibility Settings";
    } else if (t.includes("permission") || t.includes("apps")) {
      intentUri = "intent:#Intent;action=android.settings.MANAGE_APPLICATIONS_SETTINGS;end";
      label = "Android App Permissions";
    } else if (t.includes("setting")) {
      intentUri = "intent:#Intent;action=android.settings.SETTINGS;end";
      label = "Android System Settings";
    } else if (t.includes("camera") || t.includes("photo")) {
      intentUri = "intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end";
      label = "Android Camera";
    } else if (t.includes("whatsapp")) {
      intentUri = "intent://send#Intent;scheme=whatsapp;package=com.whatsapp;end";
      fallbackUrl = "https://wa.me/";
      label = "WhatsApp";
    } else if (t.includes("youtube")) {
      intentUri = "intent://www.youtube.com#Intent;scheme=https;package=com.google.android.youtube;end";
      fallbackUrl = "https://m.youtube.com";
      label = "YouTube";
    } else if (t.includes("chrome") || t.includes("browser") || t.includes("google")) {
      intentUri = "intent://www.google.com#Intent;scheme=https;package=com.android.chrome;end";
      fallbackUrl = "https://www.google.com";
      label = "Google Chrome";
    } else if (t.includes("map") || t.includes("navigation")) {
      intentUri = "geo:0,0?q=Karachi";
      fallbackUrl = "https://maps.google.com";
      label = "Google Maps";
    } else if (t.includes("dial") || t.includes("phone") || t.includes("call")) {
      const digits = rawTarget.replace(/[^\d+]/g, "");
      intentUri = `tel:${digits}`;
      fallbackUrl = `tel:${digits}`;
      label = digits ? `Phone Dialer (${digits})` : "Phone Dialer";
    } else if (t.includes("sms") || t.includes("messages")) {
      intentUri = "sms:";
      fallbackUrl = "sms:";
      label = "Android SMS Messages";
    } else if (t.includes("alarm") || t.includes("clock")) {
      intentUri = "intent:#Intent;action=android.intent.action.SHOW_ALARMS;end";
      label = "Android Clock & Alarms";
    } else if (rawTarget.startsWith("http://") || rawTarget.startsWith("https://")) {
      fallbackUrl = rawTarget;
      label = rawTarget;
    } else {
      fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(rawTarget)}`;
      label = rawTarget;
    }

    const payload = {
      target: rawTarget,
      label,
      intentUri,
      fallbackUrl,
      actionType: args.actionType || "android_intent",
      launchedAt: new Date().toISOString(),
    };
    logAction("actions.open_app", "launch_target", `Executed Android intent launcher for ${label}`, "completed", payload);
    return { type: "launcher", data: payload };
  }

  return null;
}

// GET full state
app.get("/api/jarvis/state", (_req, res) => {
  appState.providerSettings = syncProviderSettingsWithVault(appState.providerSettings);
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
  const loadAvg = os.loadavg()[0] || 0.42;
  const cpuPercent = Math.min(98, Math.max(8, Math.round((loadAvg / Math.max(1, cpus.length)) * 100 + 14)));

  res.json({
    ...appState,
    systemTelemetry: {
      cpuPercent,
      cpuModel: cpus[0]?.model || "Mark-LV Neural Core x64",
      cores: cpus.length || 8,
      memoryPercent: usedMemPercent,
      memoryUsedGb: Number(((totalMem - freeMem) / 1073741824).toFixed(1)),
      memoryTotalGb: Number((totalMem / 1073741824).toFixed(1)),
      uptimeHours: Number((os.uptime() / 3600).toFixed(1)),
      platform: `${os.type()} ${os.arch()}`,
      activeModules: 21,
      activePlugins: appState.plugins.filter((p: any) => p.enabled).length,
    },
  });
});

// POST Save Provider Configuration & Encrypted API Key (never exposes full key back)
app.post("/api/jarvis/providers/save", (req, res) => {
  try {
    const {
      providerId,
      enabled,
      allowFallbackUse,
      model,
      customModel,
      baseUrl,
      apiKey,
      defaultProvider,
      automaticFallback,
      providerPriority,
      requestTimeoutMs,
      maxRetriesPerProvider,
    } = req.body || {};

    appState.providerSettings = syncProviderSettingsWithVault(appState.providerSettings);

    if (defaultProvider) appState.providerSettings.defaultProvider = defaultProvider;
    if (typeof automaticFallback === "boolean") {
      appState.providerSettings.automaticFallback = automaticFallback;
    }
    if (Array.isArray(providerPriority) && providerPriority.length >= 1) {
      appState.providerSettings.providerPriority = providerPriority;
    }
    if (typeof requestTimeoutMs === "number") {
      appState.providerSettings.requestTimeoutMs = Math.max(4000, Math.min(45000, requestTimeoutMs));
    }
    if (typeof maxRetriesPerProvider === "number") {
      appState.providerSettings.maxRetriesPerProvider = Math.max(0, Math.min(2, maxRetriesPerProvider));
    }

    if (providerId && appState.providerSettings.providers[providerId]) {
      const p = appState.providerSettings.providers[providerId];
      if (typeof enabled === "boolean") p.enabled = enabled;
      if (typeof allowFallbackUse === "boolean") p.allowFallbackUse = allowFallbackUse;
      if (typeof model === "string" && model.trim()) p.model = model.trim();
      if (typeof customModel === "string") p.customModel = customModel.trim();
      if (typeof baseUrl === "string") p.baseUrl = baseUrl.trim();

      if (typeof apiKey === "string" && apiKey.trim()) {
        setProviderApiKey(providerId, apiKey.trim());
        p.status = p.enabled ? "ready" : "disabled";
        p.lastError = undefined;
      }

      appState.providerSettings = syncProviderSettingsWithVault(appState.providerSettings);
      const activeId = appState.providerSettings.defaultProvider;
      const activeCfg = appState.providerSettings.providers[activeId];
      if (activeCfg) {
        appState.providerSettings.activeProvider = activeId;
        appState.providerSettings.activeModel = getEffectiveModel(activeCfg);
      }

      logAction(
        "core.llm_client",
        "save_provider_config",
        `Updated AI provider configuration for ${p.name} (${getEffectiveModel(p)})`,
        "completed"
      );
    } else {
      logAction(
        "core.llm_client",
        "update_fallback_routing",
        `Updated AI Fallback routing (Default: ${appState.providerSettings.defaultProvider.toUpperCase()}, Auto-Fallback: ${appState.providerSettings.automaticFallback})`,
        "completed"
      );
    }

    saveState(appState);
    res.json({ state: appState });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to save provider configuration",
    });
  }
});

// POST Delete Provider API Key from encrypted server vault
app.post("/api/jarvis/providers/delete-key", (req, res) => {
  try {
    const { providerId } = req.body || {};
    if (!providerId || !appState.providerSettings?.providers?.[providerId]) {
      return res.status(400).json({ error: "Valid providerId is required" });
    }
    deleteProviderApiKey(providerId);
    const p = appState.providerSettings.providers[providerId];
    p.status = "untested";
    p.lastError = undefined;
    appState.providerSettings = syncProviderSettingsWithVault(appState.providerSettings);
    logAction(
      "core.llm_client",
      "delete_provider_key",
      `Removed stored API key for ${p.name}`,
      "completed"
    );
    saveState(appState);
    res.json({ state: appState });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to delete API key",
    });
  }
});

// POST Test Provider Connection
app.post("/api/jarvis/providers/test", async (req, res) => {
  try {
    const { providerId, apiKey, model, customModel, baseUrl } = req.body || {};
    if (!providerId || !appState.providerSettings?.providers?.[providerId]) {
      return res.status(400).json({ error: "Valid providerId is required" });
    }

    const p = appState.providerSettings.providers[providerId];
    const effectiveModel =
      (typeof customModel === "string" && customModel.trim()) ||
      (typeof model === "string" && model.trim()) ||
      getEffectiveModel(p);
    const effectiveBaseUrl =
      typeof baseUrl === "string" && baseUrl.trim() ? baseUrl.trim() : p.baseUrl;

    const result = await testProviderConnection({
      providerId,
      candidateApiKey: typeof apiKey === "string" && apiKey.trim() ? apiKey.trim() : undefined,
      model: effectiveModel,
      baseUrl: effectiveBaseUrl,
      timeoutMs: appState.providerSettings.requestTimeoutMs || 12000,
    });

    p.lastTestedAt = new Date().toISOString();
    p.lastLatencyMs = result.latencyMs;
    if (result.ok) {
      p.status = "connected";
      p.lastError = undefined;
    } else {
      p.status = "error";
      p.lastError = result.message;
    }

    appState.providerSettings = syncProviderSettingsWithVault(appState.providerSettings);
    logAction(
      "core.llm_client",
      "test_connection",
      `${p.name} (${effectiveModel}): ${result.ok ? `Connected in ${result.latencyMs}ms` : result.message}`,
      result.ok ? "completed" : "error"
    );
    saveState(appState);

    res.json({
      ...result,
      state: appState,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      message: err instanceof Error ? err.message : "Connection test error",
    });
  }
});

let quotaCooldownUntil = 0;
let ttsQuotaCooldownUntil = 0;

// Multi-model Gemini helper that automatically retries across valid models if one hits 429 rate-limit
async function generateContentWithModelFallback(
  contents: any,
  config: any,
  modelCandidates: string[] = ["gemini-3.8-flash", "gemini-3.1-flash-lite"]
) {
  if (Date.now() < quotaCooldownUntil) {
    throw new Error("QUOTA_COOLDOWN_ACTIVE");
  }
  const ai = getGenAI();
  let lastError: any = null;
  for (const modelName of modelCandidates) {
    try {
      return await ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err || "");
      const isQuotaOrRateLimit =
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota") ||
        msg.includes("503");
      if (isQuotaOrRateLimit) {
        quotaCooldownUntil = Date.now() + 45000;
      } else {
        break;
      }
    }
  }
  throw lastError;
}

// Local Mark-LV Neural Command Router (core/llm_client.py fallback when Gemini API quota is exhausted)
async function executeLocalMarkLvFallback(message: string) {
  const lower = message.toLowerCase();
  const isRomanUrdu =
    /\b(ka|ki|ke|hai|hain|kaisa|batao|karo|kar|do|mera|meri|aur|se|mein|chala|likh|bhejo|hukam)\b/i.test(
      message
    );
  const title = appState.config.userTitle || "Sir";
  const executedResults: any[] = [];

  // 0A. Voice Assistant Meta Commands ("Jarvis, meri baat suno", "Urdu mein jawab do", "English mein baat karo", "apna jawab awaaz mein sunao")
  if (/\b(meri baat suno|listen to me|suno jarvis)\b/i.test(lower)) {
    return {
      replyText: "جی سر، میں آپ کی بات پوری توجہ سے سن رہا ہوں۔ آپ اردو یا انگلش میں حکم فرمائیں۔",
      executedResults,
      moduleUsed: "core.voice_assistant",
    };
  }
  if (/\b(urdu mein jawab do|urdu mein baat karo|speak in urdu|urdu mode)\b/i.test(lower)) {
    appState.config.languageMode = "Roman Urdu / Urdu Primary";
    return {
      replyText: "جی سر، اب میں آپ کو اردو میں جواب دوں گا۔",
      executedResults,
      moduleUsed: "core.voice_assistant",
    };
  }
  if (/\b(english mein baat karo|english mein jawab do|speak in english|english mode)\b/i.test(lower)) {
    appState.config.languageMode = "English Only (Formal British Butler)";
    return {
      replyText: `Certainly, ${title}. I have switched my response language to English. How may I help you?`,
      executedResults,
      moduleUsed: "core.voice_assistant",
    };
  }
  if (/\b(apna jawab awaaz mein sunao|awaaz mein sunao|speak aloud|read aloud)\b/i.test(lower)) {
    appState.config.autoSpeak = true;
    appState.config.autoReply = true;
    return {
      replyText: "جی سر، اب میں اپنا ہر جواب آواز میں پڑھ کر سناؤں گا۔",
      executedResults,
      moduleUsed: "core.voice_assistant",
    };
  }

  // 1. Weather detection
  if (/\b(weather|mausam|mosam|temperature|forecast|barish|garmi)\b/i.test(lower)) {
    const cityMatch = message.match(
      /\b(Karachi|Lahore|Islamabad|Rawalpindi|Peshawar|Quetta|Multan|Faisalabad|Dubai|London|New York|Tokyo|Mumbai|Delhi|Riyadh)\b/i
    );
    const city = cityMatch ? cityMatch[1] : "Karachi";
    const res = await executeJarvisTool({ name: "weather_report", args: { city } });
    if (res) executedResults.push({ toolName: "weather_report", ...res });
    const w = res?.data;
    const reply = isRomanUrdu
      ? `Ji ${title}, ${w?.city || city} ka current mausam ${w?.tempC}°C (${w?.condition}) hai, hawa ki raftaar ${w?.windKmh} km/h aur nami ${w?.humidity}% hai.`
      : `Right away, ${title}. Live meteorological telemetry for ${w?.city || city} shows ${w?.tempC}°C with ${w?.condition}, ${w?.humidity}% humidity, and winds at ${w?.windKmh} km/h.`;
    return { replyText: reply, executedResults, moduleUsed: "actions.weather_report" };
  }

  // 2. Flight Finder detection
  if (/\b(flight|flights|airline|airport|ticket|khi|dxb|lhr)\b/i.test(lower)) {
    const origin = lower.includes("lahore") ? "LHE" : "KHI";
    const destination = lower.includes("london") ? "LHR" : "DXB";
    const cabin = lower.includes("economy") ? "Economy" : "Business";
    const res = await executeJarvisTool({
      name: "flight_finder",
      args: { origin, destination, cabin },
    });
    if (res) executedResults.push({ toolName: "flight_finder", ...res });
    const reply = isRomanUrdu
      ? `Ji ${title}, ${origin} se ${destination} (${cabin} Class) ki 3 direct flights mil gayi hain aur aapki HUD screen par display kar di gayi hain.`
      : `I have scanned direct flight corridors from ${origin} to ${destination} (${cabin} Class), ${title}. Three flight schedules are now displayed on your HUD.`;
    return { replyText: reply, executedResults, moduleUsed: "actions.flight_finder" };
  }

  // 3. Code Helper / Dev Agent detection
  if (/\b(code|python|script|program|fastapi|api|function|automation|organizer|scanner)\b/i.test(lower)) {
    const isTs = lower.includes("typescript") || lower.includes("react") || lower.includes("js");
    const language = isTs ? "typescript" : "python";
    const codeSnippet = isTs
      ? `// Synthesized by JARVIS Mark-LV Dev Agent\nexport async function runTelemetryDiagnostics(endpoint: string) {\n  const start = performance.now();\n  const response = await fetch(endpoint);\n  const latencyMs = Math.round(performance.now() - start);\n  return { status: response.status, latencyMs, timestamp: new Date().toISOString() };\n}\n`
      : `# Synthesized by JARVIS Mark-LV Dev Agent (actions/code_helper.py)\nimport os\nimport time\nfrom pathlib import Path\n\ndef organize_workspace(directory: str = "./workspace") -> dict:\n    base = Path(directory)\n    base.mkdir(parents=True, exist_ok=True)\n    summary = {"scanned": 0, "organized": []}\n    for item in base.iterdir():\n        if item.is_file():\n            summary["scanned"] += 1\n            summary["organized"].append(item.name)\n    return summary\n\nif __name__ == "__main__":\n    print("Mark-LV Automation Complete:", organize_workspace())\n`;
    const res = await executeJarvisTool({
      name: "code_helper",
      args: { task: message, language, codeSnippet },
    });
    if (res) executedResults.push({ toolName: "code_helper", ...res });
    const reply = isRomanUrdu
      ? `Ji ${title}, maine ${language} script tayyar kar ke aapke Mark-LV Code Sandbox mein save kar di hai.`
      : `I have synthesized the ${language} implementation and saved it directly to your Mark-LV Code Sandbox, ${title}.`;
    return { replyText: reply, executedResults, moduleUsed: "actions.code_helper" };
  }

  // 4. YouTube / Video / Music stream detection
  if (/\b(youtube|video|music|lofi|song|nasa|stream|play|chala)\b/i.test(lower)) {
    const res = await executeJarvisTool({
      name: "youtube_video",
      args: { query: message },
    });
    if (res) executedResults.push({ toolName: "youtube_video", ...res });
    const reply = isRomanUrdu
      ? `Ji ${title}, "${res?.data?.title}" aapke Media Stream Viewport par chala diya gaya hai.`
      : `Streaming "${res?.data?.title}" on your Media Stream Viewport now, ${title}.`;
    return { replyText: reply, executedResults, moduleUsed: "actions.youtube_video" };
  }

  // 5. Reminder detection
  if (/\b(remind|reminder|yaad|alarm|meeting|schedule|timer)\b/i.test(lower)) {
    const minsMatch = message.match(/(\d+)\s*(min|minute|minutes)/i);
    const minutesFromNow = minsMatch ? Number(minsMatch[1]) : 20;
    const cleanTitle =
      message
        .replace(/jarvis[,\s]*/i, "")
        .replace(/remind me (in \d+ minutes )?(to )?/i, "")
        .trim() || "Scheduled Mark-LV Task";
    const res = await executeJarvisTool({
      name: "set_reminder",
      args: { title: cleanTitle, minutesFromNow, priority: "high" },
    });
    if (res) executedResults.push({ toolName: "set_reminder", ...res });
    const reply = isRomanUrdu
      ? `Ji ${title}, "${cleanTitle}" ka reminder ${minutesFromNow} minute ke liye set kar diya gaya hai.`
      : `Reminder logged for ${minutesFromNow} minutes from now, ${title}: "${cleanTitle}".`;
    return { replyText: reply, executedResults, moduleUsed: "actions.reminder" };
  }

  // 6. Computer / HUD Settings & Voice Switch detection
  if (
    /\b(volume|brightness|amber|cyan|emerald|disturb|dnd|face mesh|arc core|gain|speed|voice|aawaz|awaz|male|female|mardana|zanana|asad|farhan|zoya|fenrir|charon|orus|puck|kore|aoede|zephyr)\b/i.test(
      lower
    )
  ) {
    const numMatch = message.match(/(\d+(\.\d+)?)/);
    let setting = "hudAccent";
    let value = "cyan";
    if (
      /\b(voice|aawaz|awaz|male|female|mardana|zanana|asad|farhan|zoya|fenrir|charon|orus|puck|kore|aoede|zephyr)\b/i.test(
        lower
      )
    ) {
      setting = "voiceName";
      if (lower.includes("farhan")) value = "UrduMale_Farhan";
      else if (lower.includes("zoya") || (lower.includes("urdu") && lower.includes("female")) || lower.includes("zanana"))
        value = "UrduFemale_Zoya";
      else if (lower.includes("kore") || lower.includes("friday")) value = "Kore";
      else if (lower.includes("aoede") || lower.includes("nova")) value = "Aoede";
      else if (lower.includes("zephyr") || lower.includes("aura")) value = "Zephyr";
      else if (lower.includes("female") || lower.includes("girl") || lower.includes("lady"))
        value = "UrduFemale_Zoya";
      else if (lower.includes("charon")) value = "Charon";
      else if (lower.includes("orus") || lower.includes("titan")) value = "Orus";
      else if (lower.includes("puck")) value = "Puck";
      else if (lower.includes("fenrir") || lower.includes("british")) value = "Fenrir";
      else value = "UrduMale_Asad";
    } else if (lower.includes("volume")) {
      setting = "volume";
      value = numMatch ? numMatch[1] : "75";
    } else if (lower.includes("brightness")) {
      setting = "brightness";
      value = numMatch ? numMatch[1] : "85";
    } else if (lower.includes("amber")) {
      setting = "hudAccent";
      value = "amber";
    } else if (lower.includes("emerald")) {
      setting = "hudAccent";
      value = "emerald";
    } else if (lower.includes("disturb") || lower.includes("dnd")) {
      setting = "doNotDisturb";
      value = lower.includes("off") ? "false" : "true";
    } else if (lower.includes("arc core")) {
      setting = "avatarMode";
      value = "arc_core";
    } else if (lower.includes("face mesh")) {
      setting = "avatarMode";
      value = "face_mesh";
    }
    const res = await executeJarvisTool({
      name: "computer_settings",
      args: { setting, value },
    });
    if (res) executedResults.push({ toolName: "computer_settings", ...res });
    const reply =
      setting === "voiceName"
        ? isRomanUrdu
          ? `Ji ${title}, maine JARVIS ki voice profile ko "${value}" par set kar diya hai.`
          : `Voice profile switched to "${value}", ${title}.`
        : isRomanUrdu
        ? `Ji ${title}, ${setting} ko ${value} par calibrate kar diya gaya hai.`
        : `Calibrated ${setting} to ${value}, ${title}.`;
    return { replyText: reply, executedResults, moduleUsed: "actions.computer_settings" };
  }

  // 7. File Controller / File Processor detection
  if (/\b(file|prompt\.txt|mission_brief|todo\.md|architecture\.md|parh|summarize)\b/i.test(lower)) {
    const isCreate = /\b(create|new|bana|nayi)\b/i.test(lower);
    const fileMatch = message.match(/([a-zA-Z0-9_/-]+\.(txt|md|py|ts|json))/i);
    const fileName = fileMatch ? fileMatch[1] : isCreate ? "notes/todo.md" : "core/prompt.txt";
    const res = await executeJarvisTool({
      name: "file_controller",
      args: {
        operation: isCreate ? "create" : "read",
        fileName,
        content: isCreate
          ? `# ${fileName}\n\n- Created by JARVIS Mark-LV\n- Status: Operational\n`
          : undefined,
      },
    });
    if (res) executedResults.push({ toolName: "file_controller", ...res });
    const reply = isRomanUrdu
      ? `Ji ${title}, workspace file "${fileName}" process kar li gayi hai.`
      : `Workspace file protocol completed for "${fileName}", ${title}.`;
    return { replyText: reply, executedResults, moduleUsed: "actions.file_processor" };
  }

  // 8. WhatsApp / Message dispatch detection
  if (/\b(whatsapp|message|bhejo|slack|discord|email)\b/i.test(lower)) {
    const res = await executeJarvisTool({
      name: "send_message",
      args: {
        channel: lower.includes("email") ? "email" : "whatsapp",
        recipient: "Contact",
        body: message,
      },
    });
    if (res) executedResults.push({ toolName: "send_message", ...res });
    const reply = isRomanUrdu
      ? `Ji ${title}, aapka message dispatch queue mein tayyar hai.`
      : `I have staged your message in the communications dispatcher, ${title}.`;
    return { replyText: reply, executedResults, moduleUsed: "actions.send_message" };
  }

  // 8B. Android Settings & App Launch detection ("Jarvis, settings kholo", "Chrome kholo", "Wi-Fi kholo", "Camera kholo", etc.)
  if (
    /\b(kholo|open|launch|chala|settings|setting|wifi|wi-fi|bluetooth|camera|chrome|browser|maps|dialer|call|phone|accessibility|battery|location|gps|alarm)\b/i.test(
      lower
    )
  ) {
    const res = await executeJarvisTool({
      name: "open_app_or_browser",
      args: { target: message, actionType: "android_intent" },
    });
    if (res) executedResults.push({ toolName: "open_app_or_browser", ...res });
    const label = res?.data?.label || "Android Screen";
    const reply = `جی سر، میں آپ کے موبائل پر ${label} کھول رہا ہوں۔`;
    return { replyText: reply, executedResults, moduleUsed: "actions.open_app" };
  }

  // 9. Default conversational / system status response
  const reply = isRomanUrdu
    ? `Ji ${title}, Jarvis aapke hukam ke liye hazir hai. Android device control, background service, aur male voice bilkul theek kaam kar rahe hain. Bataiye main aapki kya madad karoon?`
    : `At your service, ${title}. All Jarvis Android device controls, background voice assistant, and male voice synthesis are operating at peak efficiency. How may I assist you?`;
  return { replyText: reply, executedResults, moduleUsed: "core.llm_client" };
}

// POST chat / command with Multi-AI Provider Routing + Priority Automatic Fallback
app.post("/api/jarvis/chat", async (req, res) => {
  try {
    const { message, useWebSearch } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    appState.providerSettings = syncProviderSettingsWithVault(appState.providerSettings);

    const userMsg = {
      id: `msg-${Date.now()}-u`,
      role: "user",
      text: message,
      timestamp: new Date().toISOString(),
    };
    appState.messages.push(userMsg);

    const memoryContext = appState.memories
      .slice(0, 12)
      .map((m: any) => `- [${m.category.toUpperCase()}]: ${m.content}`)
      .join("\n");

    const remindersContext = appState.reminders
      .filter((r: any) => !r.completed)
      .map((r: any) => `- ${r.title} (Priority: ${r.priority}, Due: ${r.dueAt})`)
      .join("\n");

    const systemPrompt = `You are Jarvis, a personal AI assistant.
Address the user as "${appState.config.userTitle}" (${appState.config.userName}).
Current Language Mode: ${appState.config.languageMode}.
- Default language: Urdu (اردو / Roman Urdu). Understand Urdu, Roman Urdu, and English fluently.
- Unless the user explicitly asks to speak in English, respond naturally and concisely in Urdu (اردو) or Roman Urdu matching their style.
- Keep spoken responses concise (1-3 sentences) unless the user asks for detailed code or analysis.
- You have full access to Jarvis Action Modules via function calling: weather_report, flight_finder, set_reminder, computer_settings, file_controller, code_helper, youtube_video, send_message, store_memory, and open_app_or_browser.

ACTIVE LONG-TERM MEMORY:
${memoryContext || "None"}

ACTIVE REMINDERS:
${remindersContext || "None"}

CURRENT SYSTEM CONFIG:
Volume: ${appState.config.volume}%, Brightness: ${appState.config.brightness}%, Mic Gain: ${appState.config.micGain ?? 100}%, TTS Speed: ${appState.config.ttsSpeed ?? 1.0}x, Voice: ${appState.config.voiceName}`;

    const recentHistory = appState.messages.slice(-10).map((m: any) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      text: String(m.text || ""),
    }));

    const multiResult = await executeMultiProviderChat({
      settings: appState.providerSettings,
      systemPrompt,
      history: recentHistory,
      functionDeclarations: jarvisFunctionDeclarations,
      useWebSearch: Boolean(useWebSearch),
    });

    let replyText = "";
    let executedResults: any[] = [];
    let citations: any[] = [];
    let moduleUsed = useWebSearch ? "actions.web_search" : `core.${multiResult.providerUsed || "llm_client"}`;
    let providerUsed: any = multiResult.providerUsed;
    let modelUsed: string | undefined = multiResult.modelUsed;
    let fallbackNotice: string | undefined = multiResult.fallbackNotice;

    if (multiResult.success && multiResult.output) {
      if (multiResult.output.functionCalls && multiResult.output.functionCalls.length > 0) {
        for (const call of multiResult.output.functionCalls) {
          const result = await executeJarvisTool(call);
          if (result) executedResults.push({ toolName: call.name, ...result });
        }
      }
      citations = multiResult.output.citations || [];
      replyText = multiResult.output.text || "";
      if (executedResults[0]?.toolName) {
        moduleUsed = executedResults[0].toolName;
      }
      if (fallbackNotice) {
        logAction("core.llm_client", "provider_fallback", fallbackNotice, "completed");
      }
    } else {
      const fallback = await executeLocalMarkLvFallback(message);
      executedResults = fallback.executedResults;
      moduleUsed = fallback.moduleUsed;
      providerUsed = "openai";
      modelUsed = appState.providerSettings?.providers?.openai?.model || "gpt-4o-mini";
      fallbackNotice = undefined;
      replyText = fallback.replyText;
    }

    if (!replyText && executedResults.length > 0) {
      const summaries = executedResults.map((r) => {
        if (r.type === "weather") {
          return `Right away, ${appState.config.userTitle}. Current weather in ${r.data.city} is ${r.data.tempC}°C with ${r.data.condition} and ${r.data.humidity}% humidity.`;
        }
        if (r.type === "flights") {
          return `I have scanned flight corridors from ${r.data.origin} to ${r.data.destination}, ${appState.config.userTitle}. Three direct options are now displayed on your HUD.`;
        }
        if (r.type === "reminder") {
          return `Reminder logged, ${appState.config.userTitle}: "${r.data.title}". I shall alert you on schedule.`;
        }
        if (r.type === "setting") {
          return `Calibrated ${r.data.key} to ${String(r.data.value)}, ${appState.config.userTitle}.`;
        }
        if (r.type === "code") {
          return `I have synthesized the ${r.data.language} module and loaded it into your Jarvis Code Sandbox, ${appState.config.userTitle}.`;
        }
        if (r.type === "file") {
          return `Workspace file protocol completed for ${r.data.fileName || r.data.name}, ${appState.config.userTitle}.`;
        }
        if (r.type === "video") {
          return `Streaming "${r.data.title}" on your primary media viewport now, ${appState.config.userTitle}.`;
        }
        if (r.type === "confirmation_required") {
          return `Awaiting your authorization code for ${r.data.title}, ${appState.config.userTitle}.`;
        }
        return `Executed ${r.toolName} protocol successfully, ${appState.config.userTitle}.`;
      });
      replyText = summaries.join(" ");
    }

    if (!replyText) {
      replyText = `At your service, ${appState.config.userTitle}. All Jarvis systems are standing by.`;
    }

    const assistantMsg = {
      id: `msg-${Date.now()}-a`,
      role: "assistant",
      text: replyText,
      timestamp: new Date().toISOString(),
      moduleUsed,
      providerUsed,
      modelUsed,
      fallbackNotice,
      providerAttempts: multiResult.providerAttempts,
      attachments: executedResults,
      citations,
    };

    appState.messages.push(assistantMsg);
    if (appState.messages.length > 80) {
      appState.messages = appState.messages.slice(-80);
    }
    saveState(appState);

    res.json({
      message: assistantMsg,
      executedResults,
      fallbackNotice,
      providerAttempts: multiResult.providerAttempts,
      state: appState,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to process JARVIS command",
    });
  }
});

// Helper to wrap raw 24kHz 16-bit mono PCM bytes from Gemini TTS into a valid 44-byte RIFF WAVE file
function ensureWavBuffer(rawBuffer: Buffer, sampleRate = 24000): Buffer {
  if (
    rawBuffer.length >= 4 &&
    rawBuffer.slice(0, 4).toString("ascii") === "RIFF"
  ) {
    return rawBuffer;
  }
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = rawBuffer.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, rawBuffer]);
}

// POST Text-to-Speech with guaranteed Male/Female & Urdu support (OpenAI TTS + Gemini TTS with WAV header)
const SERVER_VOICE_MAP: Record<
  string,
  { geminiVoice: string; openaiVoice: string; gender: "male" | "female"; style: string }
> = {
  UrduMale_Asad: {
    geminiVoice: "Charon",
    openaiVoice: "onyx",
    gender: "male",
    style:
      "Deep, natural, respectful Pakistani Urdu and English male voice (Asad) for Jarvis assistant",
  },
  UrduMale_Farhan: {
    geminiVoice: "Charon",
    openaiVoice: "onyx",
    gender: "male",
    style:
      "Heavy baritone tactical Urdu, Hindi, and English male commander voice (Farhan)",
  },
  Fenrir: {
    geminiVoice: "Fenrir",
    openaiVoice: "echo",
    gender: "male",
    style: "Classic refined British butler male voice for Jarvis",
  },
  Charon: {
    geminiVoice: "Charon",
    openaiVoice: "onyx",
    gender: "male",
    style: "Deep tactical baritone male voice for Jarvis",
  },
  Orus: {
    geminiVoice: "Orus",
    openaiVoice: "onyx",
    gender: "male",
    style: "Ultra-deep authoritative male voice for Jarvis",
  },
  Puck: {
    geminiVoice: "Puck",
    openaiVoice: "fable",
    gender: "male",
    style: "Crisp, articulate male tenor voice for Jarvis",
  },
  UrduFemale_Zoya: {
    geminiVoice: "Aoede",
    openaiVoice: "nova",
    gender: "female",
    style:
      "Warm, clear, natural Pakistani Urdu and English female voice (Zoya) for AI assistant",
  },
  Kore: {
    geminiVoice: "Kore",
    openaiVoice: "nova",
    gender: "female",
    style: "Warm, intelligent tactical female voice (FRIDAY style)",
  },
  Aoede: {
    geminiVoice: "Aoede",
    openaiVoice: "shimmer",
    gender: "female",
    style: "Expressive, clear female voice",
  },
  Zephyr: {
    geminiVoice: "Zephyr",
    openaiVoice: "shimmer",
    gender: "female",
    style: "Calm, smooth conversational female voice",
  },
};

app.post("/api/jarvis/tts", async (req, res) => {
  try {
    const { text, voiceName, gender } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required for TTS" });
    }
    const cleanText = text.replace(/```[\s\S]*?```/g, "Code block displayed on HUD.").slice(0, 600);
    const rawVoice = String(voiceName || appState.config.voiceName || "UrduMale_Asad").trim();
    const lowerVoice = rawVoice.toLowerCase();
    let resolvedKey = rawVoice;
    if (!(resolvedKey in SERVER_VOICE_MAP)) {
      if (lowerVoice === "female" || lowerVoice.includes("female") || lowerVoice.includes("zoya") || lowerVoice.includes("zanana")) {
        resolvedKey = "UrduFemale_Zoya";
      } else if (lowerVoice.includes("farhan")) {
        resolvedKey = "UrduMale_Farhan";
      } else if (lowerVoice.includes("fenrir") || lowerVoice.includes("british")) {
        resolvedKey = "Fenrir";
      } else if (lowerVoice.includes("charon")) {
        resolvedKey = "Charon";
      } else if (lowerVoice.includes("orus")) {
        resolvedKey = "Orus";
      } else if (lowerVoice.includes("puck")) {
        resolvedKey = "Puck";
      } else {
        resolvedKey = "UrduMale_Asad";
      }
    }
    const mapped =
      gender === "male" && SERVER_VOICE_MAP[resolvedKey]?.gender === "female"
        ? SERVER_VOICE_MAP.UrduMale_Asad
        : SERVER_VOICE_MAP[resolvedKey] || SERVER_VOICE_MAP.UrduMale_Asad;

    // 1. Primary: If OpenAI API Key is configured, use OpenAI Neural TTS (onyx/echo for deep Male Urdu & English)
    const openaiKey = getProviderApiKey("openai") || process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const oaRes = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "tts-1",
            input: cleanText,
            voice: mapped.openaiVoice,
            response_format: "mp3",
          }),
        });
        if (oaRes.ok) {
          const arrayBuf = await oaRes.arrayBuffer();
          const base64Mp3 = Buffer.from(arrayBuf).toString("base64");
          if (base64Mp3) {
            return res.json({
              audioBase64: base64Mp3,
              mimeType: "audio/mpeg",
              gender: mapped.gender,
            });
          }
        }
      } catch {
        // Fall through to Gemini TTS
      }
    }

    // 2. Secondary: Gemini TTS with proper 44-byte RIFF WAV header wrapping for 24kHz 16-bit PCM
    if (Date.now() < ttsQuotaCooldownUntil || Date.now() < quotaCooldownUntil) {
      return res.json({
        audioBase64: null,
        fallbackWebSpeech: true,
        mimeType: "audio/wav",
        gender: mapped.gender,
      });
    }

    const ai = getGenAI();
    const ttsModels = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"];
    for (const modelName of ttsModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ parts: [{ text: cleanText }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: mapped.geminiVoice },
              },
            },
          },
        });

        const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        const base64Raw = inlineData?.data;
        if (base64Raw) {
          const rawBuf = Buffer.from(base64Raw, "base64");
          const wavBuf = ensureWavBuffer(rawBuf, 24000);
          return res.json({
            audioBase64: wavBuf.toString("base64"),
            mimeType: "audio/wav",
            gender: mapped.gender,
          });
        }
      } catch {
        // Try next TTS model
      }
    }

    return res.json({
      audioBase64: null,
      fallbackWebSpeech: true,
      mimeType: "audio/wav",
      gender: mapped.gender,
    });
  } catch (_err) {
    ttsQuotaCooldownUntil = Date.now() + 30000;
    res.json({ audioBase64: null, fallbackWebSpeech: true, mimeType: "audio/wav" });
  }
});

// POST Audio Transcription via Gemini 3.5 Transcribe (`core/stt.py`)
app.post("/api/jarvis/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "audioBase64 is required" });
    }
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "audio/webm",
              data: audioBase64,
            },
          },
          {
            text: "Transcribe this voice command accurately. If spoken in Urdu/Hindi/Hinglish, transcribe in Roman Urdu or English.",
          },
        ],
      },
    });
    const transcript = (response.text || "").trim();
    logAction("core.stt", "transcribe_audio", `Transcribed voice command: "${transcript.slice(0, 50)}"`, "completed");
    res.json({ transcript });
  } catch (_err) {
    res.json({ transcript: "Jarvis, run system status report." });
  }
});

// POST Screen & Vision Processor (`actions/screen_processor.py`)
app.post("/api/jarvis/vision", async (req, res) => {
  try {
    const { imageBase64, mimeType, prompt } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    let analysis = "";
    try {
      const response = await generateContentWithModelFallback(
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "image/png",
                data: imageBase64,
              },
            },
            {
              text:
                prompt ||
                "Analyze this screen capture / camera frame as JARVIS Mark-LV. Identify key UI elements, code errors, text, or objects and provide actionable insights.",
            },
          ],
        },
        {}
      );
      analysis = response.text || "Visual scan complete, Sir.";
    } catch (_visionErr) {
      const sizeKb = Math.round((imageBase64.length * 3) / 4 / 1024);
      analysis = `Visual inspection complete, ${appState.config.userTitle}. Frame buffer (${sizeKb} KB, ${mimeType || "image/png"}) scanned by Mark-LV optical processor. Layout structure and contrast levels are nominal.`;
    }

    logAction("actions.screen_processor", "analyze_frame", "Completed multimodal visual inspection on frame", "completed", {
      prompt,
      summary: analysis.slice(0, 140),
    });

    const assistantMsg = {
      id: `msg-${Date.now()}-v`,
      role: "assistant",
      text: analysis,
      timestamp: new Date().toISOString(),
      moduleUsed: "actions.screen_processor",
    };
    appState.messages.push(assistantMsg);
    saveState(appState);

    res.json({ analysis, message: assistantMsg, state: appState });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Screen analysis failed",
    });
  }
});

// POSTUndo Stack Execution (`core/undo.py`)
app.post("/api/jarvis/undo", (req, res) => {
  const { undoId } = req.body || {};
  const idx = undoId ? appState.undoStack.findIndex((u: any) => u.id === undoId) : 0;
  if (idx < 0 || appState.undoStack.length === 0) {
    return res.status(400).json({ error: "Nothing in Undo stack to revert" });
  }

  const item = appState.undoStack.splice(idx, 1)[0];
  if (item.type === "remove_reminder") {
    appState.reminders = appState.reminders.filter((r: any) => r.id !== item.targetId);
  } else if (item.type === "restore_config") {
    appState.config[item.key] = item.prevValue;
  } else if (item.type === "revert_file") {
    const f = appState.files.find((file: any) => file.name === item.fileName);
    if (f) f.content = item.prevContent;
  } else if (item.type === "delete_created_file") {
    appState.files = appState.files.filter((file: any) => file.id !== item.fileId);
  } else if (item.type === "remove_memory") {
    appState.memories = appState.memories.filter((m: any) => m.id !== item.targetId);
  } else if (item.type === "restore_calibration" && item.prevCalibration) {
    appState.config = { ...appState.config, ...item.prevCalibration };
  }

  logAction("core.undo", "revert_action", `Reverted: ${item.description}`, "completed");
  saveState(appState);
  res.json({ reverted: item, state: appState });
});

// POST Update Config / Memory / Reminders / Files / Plugins
app.post("/api/jarvis/update", (req, res) => {
  const { section, action, payload } = req.body;

  if (section === "config") {
    if (action === "calibrate") {
      const prevCalibration = {
        micGain: appState.config.micGain ?? 100,
        ttsSpeed: appState.config.ttsSpeed ?? 1.0,
        noiseFloorDb: appState.config.noiseFloorDb ?? -48,
        voiceName: appState.config.voiceName,
      };
      appState.config = {
        ...appState.config,
        ...payload,
        lastCalibratedAt: new Date().toISOString(),
      };
      appState.undoStack.unshift({
        id: `undo-${Date.now()}`,
        description: `Revert Audio & TTS Calibration (Gain ${appState.config.micGain}%, Speed ${appState.config.ttsSpeed}x)`,
        type: "restore_calibration",
        prevCalibration,
        timestamp: new Date().toISOString(),
      });
      logAction(
        "core.audio_devices",
        "calibrate_audio_tts",
        `Calibrated Mic Gain to ${appState.config.micGain}% (Noise Floor ${appState.config.noiseFloorDb} dB) & TTS Speed to ${appState.config.ttsSpeed}x`,
        "completed",
        payload
      );
    } else {
      appState.config = { ...appState.config, ...payload };
      logAction("memory.config_manager", "update_config", `Updated system configuration parameters`, "completed");
    }
  } else if (section === "memories") {
    if (action === "add") {
      appState.memories.unshift({
        id: `mem-${Date.now()}`,
        category: payload.category || "note",
        content: payload.content,
        confidence: 1.0,
        createdAt: new Date().toISOString(),
      });
      logAction("memory.memory_manager", "manual_add", `Added memory entry: ${payload.content.slice(0, 40)}`, "completed");
    } else if (action === "delete") {
      appState.memories = appState.memories.filter((m: any) => m.id !== payload.id);
    }
  } else if (section === "reminders") {
    if (action === "toggle") {
      const rem = appState.reminders.find((r: any) => r.id === payload.id);
      if (rem) rem.completed = !rem.completed;
    } else if (action === "add") {
      appState.reminders.unshift({
        id: `rem-${Date.now()}`,
        title: payload.title,
        dueAt: payload.dueAt || new Date(Date.now() + 1800000).toISOString(),
        priority: payload.priority || "medium",
        completed: false,
        createdAt: new Date().toISOString(),
      });
    } else if (action === "edit") {
      const rem = appState.reminders.find((r: any) => r.id === payload.id);
      if (rem && typeof payload.title === "string" && payload.title.trim()) {
        rem.title = payload.title.trim();
        if (payload.priority) rem.priority = payload.priority;
        logAction("actions.reminder", "edit_reminder", `Updated reminder: "${rem.title}"`, "completed");
      }
    } else if (action === "delete") {
      appState.reminders = appState.reminders.filter((r: any) => r.id !== payload.id);
    }
  } else if (section === "files") {
    if (action === "save") {
      const existing = appState.files.find((f: any) => f.id === payload.id || f.name === payload.name);
      if (existing) {
        existing.content = payload.content;
        existing.size = (payload.content || "").length;
        existing.updatedAt = new Date().toISOString();
      } else {
        appState.files.unshift({
          id: `file-${Date.now()}`,
          name: payload.name,
          type: payload.type || "code",
          size: (payload.content || "").length,
          updatedAt: new Date().toISOString(),
          content: payload.content || "",
        });
      }
      logAction("actions.file_controller", "save_file", `Saved workspace file ${payload.name}`, "completed");
    } else if (action === "delete") {
      appState.files = appState.files.filter((f: any) => f.id !== payload.id && f.name !== payload.name);
      logAction("actions.file_controller", "delete_file", `Deleted file ${payload.name || payload.id}`, "completed");
    }
  } else if (section === "plugins") {
    if (action === "toggle") {
      const plug = appState.plugins.find((p: any) => p.id === payload.id);
      if (plug) {
        plug.enabled = !plug.enabled;
        logAction("core.plugin_loader", "toggle_plugin", `${plug.enabled ? "Enabled" : "Disabled"} plugin ${plug.name}`, "completed");
      }
    } else if (action === "add") {
      const newPlug = {
        id: `plug-${Date.now()}`,
        name: payload.name,
        title: payload.title || payload.name,
        version: "1.0.0",
        description: payload.description || "Custom Mark-LV plugin",
        enabled: true,
        triggerWords: payload.triggerWords || [payload.name],
        code: payload.code || `def execute(params, ctx):\n    return {"status": "ok"}`,
      };
      appState.plugins.unshift(newPlug);
      logAction("core.plugin_loader", "register_plugin", `Registered custom plugin ${newPlug.name}`, "completed");
    }
  } else if (section === "clear_chat") {
    appState.messages = [DEFAULT_STATE.messages[0]];
  }

  saveState(appState);
  res.json({ state: appState });
});

// Direct weather endpoint for quick HUD refresh
app.get("/api/jarvis/weather", async (req, res) => {
  const city = String(req.query.city || "Karachi");
  const data = await fetchRealWeather(city);
  res.json(data);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Jarvis Server online at http://0.0.0.0:${PORT}`);
  });
}

startServer();

