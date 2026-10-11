/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  BatteryCharging,
  Bluetooth,
  Camera,
  CloudSun,
  Code2,
  Cpu,
  Download,
  ExternalLink,
  Globe,
  KeyRound,
  MapPin,
  Mic,
  MicOff,
  PhoneCall,
  Plane,
  Play,
  Radio,
  RotateCcw,
  Send,
  Settings,
  ShieldAlert,
  Sliders,
  Smartphone,
  Square,
  Volume2,
  VolumeX,
  Wifi,
} from "lucide-react";
import { AvatarMesh3D } from "./components/AvatarMesh3D";
import { ActionsAndPluginsView } from "./components/ActionsAndPluginsView";
import { VisionAndCodeView } from "./components/VisionAndCodeView";
import { DashboardAndMemoryView } from "./components/DashboardAndMemoryView";
import { AudioCalibrationModal } from "./components/AudioCalibrationModal";
import { AIProviderSettingsView } from "./components/AIProviderSettingsView";
import {
  AIProviderId,
  getVoiceProfile,
  JARVIS_VOICE_PROFILES,
  JarvisAppState,
  JarvisConfig,
  JarvisFile,
  JarvisVoiceId,
  JarvisVoiceProfile,
  normalizeVoiceId,
  VisemeCode,
} from "./types/jarvis";

const VISEME_CYCLE: VisemeCode[] = ["AA", "EE", "OO", "MBP", "II", "FV", "LTD", "UU", "WR"];

const KNOWN_MALE_VOICE_KEYWORDS = [
  "asad",
  "madhur",
  "prabhat",
  "hemant",
  "ravi",
  "daniel",
  "george",
  "guy",
  "ryan",
  "david",
  "mark",
  "james",
  "richard",
  "oliver",
  "arthur",
  "thomas",
  "rishi",
  "aaron",
  "alex",
  "fred",
  "christopher",
  "eric",
  "steffan",
  "andrew",
  "brian",
  "suleiman",
  "faizan",
  "uk english male",
  "us english male",
  "en-gb-x-rjs",
  "en-gb-x-gbd",
  "en-gb-x-fis",
  "en-us-x-iom",
  "en-us-x-tpd",
  "en-us-x-sfg",
  "en-in-x-end",
  "en-in-x-ene",
  "ur-pk-x-urm",
  "ur-in-x-urm",
  "hi-in-x-hid",
  "hi-in-x-hie",
  "#male",
  "_male",
  "-male",
  " male",
];

const KNOWN_FEMALE_VOICE_KEYWORDS = [
  "zoya",
  "uzma",
  "swara",
  "neerja",
  "heera",
  "kalpana",
  "zira",
  "hazel",
  "susan",
  "libby",
  "sonia",
  "samantha",
  "victoria",
  "karen",
  "moira",
  "tessa",
  "veena",
  "aria",
  "jenny",
  "sabina",
  "paulina",
  "monica",
  "luciana",
  "amelie",
  "anna",
  "lekha",
  "fiona",
  "siri",
  "cortana",
  "google us english",
  "google uk english female",
  "google اردو",
  "google हिन्दी",
  "google hindi",
  "google urdu",
  "ur-pk-x-urf",
  "ur-pk-x-sfg",
  "hi-in-x-hif",
  "hi-in-x-hia",
  "en-in-x-ena",
  "en-in-x-enc",
  "en-gb-x-gba",
  "en-gb-x-gbc",
  "en-us-x-iob",
  "en-us-x-iog",
  "en-us-x-tpf",
  "uk english female",
  "us english female",
  "female",
];

function isVoiceLikelyMale(v: SpeechSynthesisVoice): boolean {
  const n = ` ${v.name} ${v.voiceURI} `.toLowerCase();
  if (n.includes("female") || KNOWN_FEMALE_VOICE_KEYWORDS.some((kw) => n.includes(kw))) {
    return false;
  }
  return KNOWN_MALE_VOICE_KEYWORDS.some((kw) => n.includes(kw));
}

function isVoiceLikelyFemale(v: SpeechSynthesisVoice): boolean {
  const n = ` ${v.name} ${v.voiceURI} `.toLowerCase();
  if (n.includes("female")) return true;
  if (KNOWN_MALE_VOICE_KEYWORDS.some((kw) => n.includes(kw))) return false;
  if (KNOWN_FEMALE_VOICE_KEYWORDS.some((kw) => n.includes(kw))) return true;
  // On Android / Chrome, generic "Google <Language>" voices without a male tag default to female
  if (n.includes("google") && !n.includes("male")) return true;
  return false;
}

function selectBestBrowserVoice(
  profile: JarvisVoiceProfile,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const langMatches = (v: SpeechSynthesisVoice, targetLang: string) => {
    const vLang = (v.lang || "").toLowerCase().replace("_", "-");
    const tLang = targetLang.toLowerCase();
    return vLang === tLang || vLang.startsWith(tLang.split("-")[0]);
  };

  if (profile.gender === "male") {
    // 1. Exact/fallback language match + verified Male voice (e.g. Asad ur-PK, Madhur hi-IN, Rishi/Prabhat en-IN, Daniel/George en-GB)
    for (const targetLang of profile.fallbackLangs) {
      const found = voices.find((v) => langMatches(v, targetLang) && isVoiceLikelyMale(v));
      if (found) return found;
    }
    // 2. Any verified Male voice installed on the system (guarantees male voice model instead of female)
    const anyMale = voices.find((v) => isVoiceLikelyMale(v));
    if (anyMale) return anyMale;
    // 3. Language match that is NOT a known/default female voice
    for (const targetLang of profile.fallbackLangs) {
      const found = voices.find((v) => langMatches(v, targetLang) && !isVoiceLikelyFemale(v));
      if (found) return found;
    }
    // 4. Any voice on the device that is not female, or fallback to first available (with deep baritone pitch shift)
    return voices.find((v) => !isVoiceLikelyFemale(v)) || voices[0];
  } else {
    // 1. Exact/fallback language match + known Female voice
    for (const targetLang of profile.fallbackLangs) {
      const found = voices.find((v) => langMatches(v, targetLang) && isVoiceLikelyFemale(v));
      if (found) return found;
    }
    // 2. Any known Female voice
    const anyFemale = voices.find((v) => isVoiceLikelyFemale(v));
    if (anyFemale) return anyFemale;
    // 3. Language match
    for (const targetLang of profile.fallbackLangs) {
      const found = voices.find((v) => langMatches(v, targetLang));
      if (found) return found;
    }
    return voices[0];
  }
}

function charToViseme(ch: string): VisemeCode {
  const c = ch.toLowerCase();
  if ("aá".includes(c)) return "AA";
  if ("eé".includes(c)) return "EE";
  if ("iíy".includes(c)) return "II";
  if ("oó".includes(c)) return "OO";
  if ("uúw".includes(c)) return "UU";
  if ("mbp".includes(c)) return "MBP";
  if ("fv".includes(c)) return "FV";
  if ("ltdnstz".includes(c)) return "LTD";
  if ("rjqk".includes(c)) return "WR";
  return "SIL";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "hud" | "actions" | "vision_code" | "memory_dashboard" | "ai_providers"
  >("hud");

  const [appState, setAppState] = useState<JarvisAppState | null>(null);
  const [loadingState, setLoadingState] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string>("");

  // Chat & Command state
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);

  // Voice, TTS & Viseme Lip-Sync state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLangMode, setSpeechLangMode] = useState<"auto" | "ur-PK" | "en-US">("auto");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [currentViseme, setCurrentViseme] = useState<VisemeCode>("SIL");
  const [statusText, setStatusText] = useState<string>("Jarvis Online · Standing By");

  // Live HUD Widgets & Android Control / Background state
  const [weatherData, setWeatherData] = useState<any>({
    city: "Karachi",
    country: "PK",
    tempC: 28,
    feelsLikeC: 29,
    humidity: 54,
    windKmh: 14,
    condition: "Clear Sky",
    daily: [],
  });
  const [weatherCityInput, setWeatherCityInput] = useState<string>("Karachi");
  const [pendingConfirmation, setPendingConfirmation] = useState<any | null>(null);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Android Background Mode, Wake Lock, Home Screen Install & Device Status
  const [backgroundMode, setBackgroundMode] = useState<boolean>(true);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [batteryStatus, setBatteryStatus] = useState<{ level: number; charging: boolean }>({
    level: 100,
    charging: true,
  });
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [lastAndroidAction, setLastAndroidAction] = useState<string>(
    "Background Service & Home Screen Actions Ready"
  );

  // Refs for audio playback, Web Audio Analyser, SpeechRecognition, MediaRecorder, and Auto-Mic Loop
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgKeepAliveAudioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const visemeTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const autoMicOpenRef = useRef<boolean>(true);
  const autoReplyRef = useRef<boolean>(true);
  const isSpeakingRef = useRef<boolean>(false);
  const isThinkingRef = useRef<boolean>(false);
  const isCalibrationOpenRef = useRef<boolean>(false);
  const autoRestartTimerRef = useRef<number | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const hasAutoStartedMicRef = useRef<boolean>(false);
  const lastDispatchedVoiceRef = useRef<{ text: string; time: number }>({
    text: "",
    time: 0,
  });

  // Launch real Android Intent URI or fallback URL
  const launchAndroidIntent = useCallback(
    (intentUri?: string, fallbackUrl?: string, label?: string) => {
      const displayLabel = label || "Android Action";
      setLastAndroidAction(`Launched: ${displayLabel}`);
      const isAndroid = /Android/i.test(navigator.userAgent || "");

      if (isAndroid && intentUri) {
        window.location.href = intentUri;
        return;
      }
      if (fallbackUrl) {
        if (fallbackUrl.startsWith("tel:") || fallbackUrl.startsWith("sms:") || fallbackUrl.startsWith("geo:")) {
          window.location.href = fallbackUrl;
        } else {
          const a = document.createElement("a");
          a.href = fallbackUrl;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        return;
      }
      if (intentUri) {
        window.location.href = intentUri;
      }
    },
    []
  );

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/jarvis/state");
      if (!res.ok) throw new Error("Failed to load Jarvis state");
      const data = await res.json();
      setAppState(data);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Connection error");
    } finally {
      setLoadingState(false);
    }
  }, []);

  const fetchWeather = useCallback(async (city: string) => {
    try {
      const res = await fetch(`/api/jarvis/weather?city=${encodeURIComponent(city)}`);
      if (res.ok) {
        const data = await res.json();
        setWeatherData(data);
      }
    } catch {
      // Keep existing weather state on transient failure
    }
  }, []);

  useEffect(() => {
    fetchState();
    fetchWeather("Karachi");
    const interval = window.setInterval(fetchState, 12000);
    return () => window.clearInterval(interval);
  }, [fetchState, fetchWeather]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [appState?.messages?.length, isThinking]);

  // Sync state refs for continuous Auto-Mic & Auto-Reply callbacks
  useEffect(() => {
    autoMicOpenRef.current = appState?.config?.autoMicOpen ?? true;
    autoReplyRef.current = appState?.config?.autoReply ?? true;
  }, [appState?.config?.autoMicOpen, appState?.config?.autoReply]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isThinkingRef.current = isThinking;
  }, [isThinking]);

  useEffect(() => {
    isCalibrationOpenRef.current = isCalibrationOpen;
  }, [isCalibrationOpen]);

  const stopActiveListening = useCallback(() => {
    if (autoRestartTimerRef.current) {
      window.clearTimeout(autoRestartTimerRef.current);
      autoRestartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsListening(false);
  }, []);

  const scheduleAutoMicReopen = useCallback((delayMs = 380) => {
    if (autoRestartTimerRef.current) {
      window.clearTimeout(autoRestartTimerRef.current);
    }
    autoRestartTimerRef.current = window.setTimeout(() => {
      if (
        autoMicOpenRef.current &&
        !isSpeakingRef.current &&
        !isThinkingRef.current &&
        !isCalibrationOpenRef.current
      ) {
        startListeningRef.current();
      }
    }, delayMs);
  }, []);

  // Stop any ongoing speech & viseme animation, optionally resuming Auto-Mic afterwards
  const stopSpeaking = useCallback(
    (resumeAutoMic = false) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (visemeTimerRef.current) {
        window.clearInterval(visemeTimerRef.current);
        visemeTimerRef.current = null;
      }
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setAudioLevel(0);
      setCurrentViseme("SIL");
      setStatusText(
        autoMicOpenRef.current
          ? "Auto-Mic Ready · Listening Loop Active"
          : "Jarvis Online · Standing By"
      );

      if (resumeAutoMic && autoMicOpenRef.current) {
        scheduleAutoMicReopen(350);
      }
    },
    [scheduleAutoMicReopen]
  );

  // Preload browser SpeechSynthesis voices so Urdu/Hindi/English Male & Female voices are ready
  const browserVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      if (list && list.length > 0) {
        browserVoicesRef.current = list;
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Speak text with Gemini 3.8 Flash Lite TTS + real-time 3D Face Mesh Viseme Lip-Sync
  const speakWithVisemes = useCallback(
    async (text: string, voiceOverride?: string, speedOverride?: number) => {
      // Pause microphone while JARVIS speaks (Echo Guard) so JARVIS doesn't hear itself
      stopActiveListening();
      stopSpeaking(false);
      const clean = text.replace(/[*#`_~]/g, "").trim();
      if (!clean) {
        if (autoMicOpenRef.current) scheduleAutoMicReopen(300);
        return;
      }

      const resolvedVoiceId = normalizeVoiceId(
        voiceOverride || appState?.config?.voiceName || "UrduMale_Asad"
      );
      const voiceProfile = getVoiceProfile(resolvedVoiceId);
      const baseSpeed = Math.max(
        0.7,
        Math.min(1.5, Number(speedOverride ?? appState?.config?.ttsSpeed ?? 1.0))
      );
      const effectiveSpeed = Math.max(
        0.7,
        Math.min(1.5, baseSpeed * (voiceProfile.rateMultiplier || 1.0))
      );
      const effectiveVolume = Math.max(
        0,
        Math.min(1, Number(appState?.config?.volume ?? 85) / 100)
      );
      const visemeIntervalMs = Math.max(40, Math.round(85 / effectiveSpeed));

      isSpeakingRef.current = true;
      setIsSpeaking(true);
      setStatusText(
        `Speaking (${voiceProfile.gender === "male" ? "♂ Male" : "♀ Female"} · ${
          voiceProfile.label.split("—")[0].trim()
        } · ${effectiveSpeed.toFixed(2)}x)`
      );

      // Schedule character-driven viseme transitions while audio plays
      let charIdx = 0;
      const startPhonemeTicker = () => {
        if (visemeTimerRef.current) window.clearInterval(visemeTimerRef.current);
        visemeTimerRef.current = window.setInterval(() => {
          const ch = clean[charIdx % clean.length] || "a";
          charIdx++;
          const v = charToViseme(ch);
          setCurrentViseme(v === "SIL" ? VISEME_CYCLE[charIdx % VISEME_CYCLE.length] : v);
          setAudioLevel((prev) => (prev > 0.15 ? prev : 0.35 + Math.random() * 0.45));
        }, visemeIntervalMs);
      };

      try {
        const res = await fetch("/api/jarvis/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: clean,
            voiceName: voiceProfile.id,
            gender: voiceProfile.gender,
            geminiVoice: voiceProfile.geminiVoice,
            openaiVoice: voiceProfile.openaiVoice,
          }),
        });

        if (!res.ok) throw new Error("Server TTS unavailable");
        const { audioBase64, mimeType } = await res.json();
        if (!audioBase64) throw new Error("Empty TTS payload");

        const resolvedMime = mimeType || "audio/wav";
        const audio = new Audio(`data:${resolvedMime};base64,${audioBase64}`);
        audio.playbackRate = effectiveSpeed;
        audio.volume = effectiveVolume;
        audioRef.current = audio;

        // Connect Web Audio API AnalyserNode + Male Baritone EQ Filter (singleton destination graph)
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioCtx();
          }
          const ctx = audioCtxRef.current;
          if (ctx.state === "suspended") await ctx.resume();

          if (!bassFilterRef.current || !analyserRef.current) {
            const bassFilter = ctx.createBiquadFilter();
            bassFilter.type = "lowshelf";
            bassFilter.frequency.value = 165;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;

            bassFilter.connect(analyser);
            analyser.connect(ctx.destination);

            bassFilterRef.current = bassFilter;
            analyserRef.current = analyser;
          }

          bassFilterRef.current.gain.value = voiceProfile.gender === "male" ? 6.0 : 0;

          const source = ctx.createMediaElementSource(audio);
          source.connect(bassFilterRef.current);

          const analyser = analyserRef.current;
          const freqData = new Uint8Array(analyser.frequencyBinCount);
          startPhonemeTicker();

          const updateMeter = () => {
            if (!audioRef.current || audioRef.current.paused) return;
            analyser.getByteFrequencyData(freqData);
            let sum = 0;
            for (let i = 0; i < freqData.length; i++) sum += freqData[i];
            const avg = sum / (freqData.length * 255);
            setAudioLevel(Math.min(1, avg * 2.4));
            requestAnimationFrame(updateMeter);
          };

          audio.onplay = () => {
            requestAnimationFrame(updateMeter);
          };
        } catch {
          startPhonemeTicker();
        }

        audio.onended = () => {
          stopSpeaking(true);
        };
        audio.onerror = () => {
          stopSpeaking(true);
        };

        await audio.play();
      } catch {
        // Fallback to browser SpeechSynthesis with strict Male/Female voice model selection
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(clean);
          const voices =
            browserVoicesRef.current.length > 0
              ? browserVoicesRef.current
              : window.speechSynthesis.getVoices();
          const chosenVoice = selectBestBrowserVoice(voiceProfile, voices);
          const verifiedMale = chosenVoice ? isVoiceLikelyMale(chosenVoice) : false;

          if (chosenVoice) {
            utterance.voice = chosenVoice;
            utterance.lang = chosenVoice.lang || voiceProfile.lang;
          } else {
            utterance.lang = voiceProfile.lang;
          }

          if (voiceProfile.gender === "male") {
            // Ensure male synthesis voice sounds unmistakably male even on limited mobile TTS engines
            utterance.pitch = verifiedMale ? Math.min(0.8, voiceProfile.pitch) : 0.55;
            utterance.rate = verifiedMale ? effectiveSpeed : Math.min(0.98, effectiveSpeed * 0.94);
          } else {
            utterance.pitch = voiceProfile.pitch;
            utterance.rate = effectiveSpeed;
          }
          utterance.volume = effectiveVolume;
          startPhonemeTicker();
          utterance.onend = () => stopSpeaking(true);
          utterance.onerror = () => stopSpeaking(true);
          window.speechSynthesis.speak(utterance);
        } else {
          stopSpeaking(true);
        }
      }
    },
    [
      appState?.config?.voiceName,
      appState?.config?.ttsSpeed,
      appState?.config?.volume,
      stopActiveListening,
      stopSpeaking,
      scheduleAutoMicReopen,
    ]
  );

  // Send command to JARVIS backend & automatically trigger voice reply + Android Intent execution + mic re-open
  const sendCommand = useCallback(
    async (promptText: string, forceSearch = false) => {
      const trimmed = promptText.trim();
      if (!trimmed || isThinkingRef.current) return;

      stopActiveListening();
      setErrorBanner("");
      isThinkingRef.current = true;
      setIsThinking(true);
      setStatusText("Processing Neural Command...");

      try {
        const res = await fetch("/api/jarvis/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            useWebSearch: forceSearch || useWebSearch,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "JARVIS failed to process command");
        }

        setAppState((prev) =>
          prev
            ? {
                ...data.state,
                systemTelemetry: prev.systemTelemetry,
              }
            : data.state
        );

        // Process any returned tool attachments (Weather, Android Intents, Reminders, Confirmations)
        if (Array.isArray(data.executedResults)) {
          for (const item of data.executedResults) {
            if (item.type === "weather" && item.data) {
              setWeatherData(item.data);
            } else if (item.type === "confirmation_required" && item.data) {
              setPendingConfirmation(item.data);
            } else if (item.type === "launcher" && item.data) {
              launchAndroidIntent(
                item.data.intentUri,
                item.data.fallbackUrl,
                item.data.label || item.data.target
              );
            } else if (item.type === "reminder" && item.data) {
              if (
                typeof window !== "undefined" &&
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                new Notification("Jarvis Reminder Scheduled", {
                  body: `${item.data.title}`,
                  icon: "/pwa-192x192.png",
                });
              }
            }
          }
        }

        isThinkingRef.current = false;
        setIsThinking(false);

        const shouldAutoReplySpeak =
          (data.state?.config?.autoReply ?? true) &&
          data.state?.config?.autoSpeak !== false &&
          Boolean(data.message?.text);

        if (shouldAutoReplySpeak) {
          await speakWithVisemes(data.message.text, data.state?.config?.voiceName);
        } else {
          setStatusText(
            autoMicOpenRef.current
              ? "Auto-Mic Active · Listening for Next Command"
              : "Jarvis Online · Standing By"
          );
          if (autoMicOpenRef.current) {
            scheduleAutoMicReopen(350);
          }
        }
      } catch (err) {
        isThinkingRef.current = false;
        setIsThinking(false);
        setErrorBanner(err instanceof Error ? err.message : "Failed to communicate with Jarvis");
        setStatusText("Jarvis Alert · Check Console");
        if (autoMicOpenRef.current) {
          scheduleAutoMicReopen(1500);
        }
      }
    },
    [useWebSearch, speakWithVisemes, stopActiveListening, scheduleAutoMicReopen, launchAndroidIntent]
  );

  // Start voice listening (supports continuous Auto-Mic Open + Auto-Submit on speech completion)
  const startVoiceListening = useCallback(async () => {
    if (isSpeakingRef.current || isThinkingRef.current || isCalibrationOpenRef.current) {
      return;
    }

    stopActiveListening();

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        const resolvedLang =
          speechLangMode === "ur-PK"
            ? "ur-PK"
            : speechLangMode === "en-US"
            ? "en-US"
            : appState?.config?.languageMode?.toLowerCase().includes("english only")
            ? "en-US"
            : "en-IN";
        recognition.lang = resolvedLang;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        let latestInterim = "";
        let dispatchedCommand = false;

        const dispatchDedupedVoiceCommand = (rawText: string) => {
          const cleanText = rawText.trim();
          if (!cleanText) return;
          const now = Date.now();
          if (
            lastDispatchedVoiceRef.current.text.toLowerCase() === cleanText.toLowerCase() &&
            now - lastDispatchedVoiceRef.current.time < 2500
          ) {
            return;
          }
          lastDispatchedVoiceRef.current = { text: cleanText, time: now };
          setInputPrompt("");
          setAudioLevel(0);
          sendCommand(cleanText);
        };

        recognition.onstart = () => {
          setIsListening(true);
          setStatusText(
            autoMicOpenRef.current
              ? `Auto-Mic 🎤 Listening (${resolvedLang}) · Urdu / Roman Urdu / English`
              : `Listening (${resolvedLang}) · Speak Command`
          );
        };

        recognition.onresult = (event: any) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const piece = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) {
              finalTranscript += piece;
            } else {
              interimTranscript += piece;
            }
          }

          if (interimTranscript.trim()) {
            latestInterim = interimTranscript.trim();
            setInputPrompt(latestInterim);
            setAudioLevel(0.25 + Math.random() * 0.45);
          }

          if (finalTranscript.trim() && !dispatchedCommand) {
            dispatchedCommand = true;
            dispatchDedupedVoiceCommand(finalTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          setAudioLevel(0);
          const errCode = String(event?.error || "");
          // If permission denied or blocked, do not spin infinitely and show clear Urdu + English error
          if (errCode === "not-allowed" || errCode === "service-not-allowed") {
            setErrorBanner(
              "مائیکروفون کی اجازت درکار ہے (Microphone permission denied). براہ کرم براؤزر یا اینڈرائیڈ سیٹنگز میں مائیک کی اجازت دیں۔"
            );
            setStatusText("Mic Permission Needed · Click Mic to Enable");
            return;
          }
          if (errCode === "network" || errCode === "audio-capture") {
            setErrorBanner(
              `آواز شناخت کرنے میں مسئلہ پیش آیا (${errCode}). براہ کرم دوبارہ کوشش کریں۔`
            );
          }
          if (
            autoMicOpenRef.current &&
            !isSpeakingRef.current &&
            !isThinkingRef.current &&
            !isCalibrationOpenRef.current
          ) {
            scheduleAutoMicReopen(600);
          } else {
            setStatusText("Jarvis Online · Standing By");
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          setAudioLevel(0);
          if (!dispatchedCommand && latestInterim.trim().length > 1) {
            dispatchedCommand = true;
            const toSend = latestInterim.trim();
            latestInterim = "";
            dispatchDedupedVoiceCommand(toSend);
            return;
          }
          if (
            !dispatchedCommand &&
            autoMicOpenRef.current &&
            !isSpeakingRef.current &&
            !isThinkingRef.current &&
            !isCalibrationOpenRef.current
          ) {
            scheduleAutoMicReopen(350);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch {
        // Fall through to MediaRecorder + VAD fallback
      }
    }

    // Fallback: record audio via MediaRecorder with Silence Auto-Detection (VAD) + Gemini 3.5 Transcribe
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      // Voice Activity Detection for hands-free auto-submit on MediaRecorder fallback
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const vadCtx = new AudioCtx();
      const vadSource = vadCtx.createMediaStreamSource(stream);
      const vadAnalyser = vadCtx.createAnalyser();
      vadAnalyser.fftSize = 256;
      vadSource.connect(vadAnalyser);
      const pcm = new Uint8Array(vadAnalyser.fftSize);
      let spokeAtLeastOnce = false;
      let silenceFrames = 0;

      const vadInterval = window.setInterval(() => {
        if (recorder.state !== "recording") {
          window.clearInterval(vadInterval);
          return;
        }
        vadAnalyser.getByteTimeDomainData(pcm);
        let sumSq = 0;
        for (let i = 0; i < pcm.length; i++) {
          const norm = (pcm[i] - 128) / 128;
          sumSq += norm * norm;
        }
        const rms = Math.sqrt(sumSq / pcm.length);
        setAudioLevel(Math.min(1, rms * 4));
        if (rms > 0.045) {
          spokeAtLeastOnce = true;
          silenceFrames = 0;
        } else if (spokeAtLeastOnce) {
          silenceFrames++;
          // ~1.4 seconds of silence after speaking -> auto stop and submit!
          if (silenceFrames >= 14) {
            window.clearInterval(vadInterval);
            if (recorder.state === "recording") recorder.stop();
          }
        }
      }, 100);

      recorder.onstop = async () => {
        window.clearInterval(vadInterval);
        vadCtx.close().catch(() => {});
        stream.getTracks().forEach((t) => t.stop());
        setAudioLevel(0);
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = String(reader.result || "").split(",")[1];
          if (!base64) return;
          setStatusText("Transcribing via Gemini 3.5...");
          const res = await fetch("/api/jarvis/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioBase64: base64, mimeType: "audio/webm" }),
          });
          if (res.ok) {
            const { transcript } = await res.json();
            if (transcript && transcript.trim()) {
              setInputPrompt("");
              sendCommand(transcript.trim());
              return;
            }
          }
          setStatusText("Jarvis Online · Standing By");
          if (autoMicOpenRef.current) scheduleAutoMicReopen(500);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
      setStatusText("Auto-Mic Recording · Speak Command");
    } catch {
      setErrorBanner("Microphone permission could not be initialized.");
    }
  }, [sendCommand, stopActiveListening, scheduleAutoMicReopen]);

  useEffect(() => {
    startListeningRef.current = startVoiceListening;
  }, [startVoiceListening]);

  // Toggle manual / continuous voice input
  const toggleVoiceInput = useCallback(async () => {
    if (isListening) {
      stopActiveListening();
      setStatusText("Mic Paused · Click Mic to Resume");
      return;
    }
    stopSpeaking(false);
    await startVoiceListening();
  }, [isListening, stopActiveListening, stopSpeaking, startVoiceListening]);

  // Auto-open microphone on boot when autoMicOpen is enabled (with first-gesture fallback if browser blocks unprompted mic)
  useEffect(() => {
    if (loadingState || !appState) return;
    const isAutoMic = appState.config.autoMicOpen ?? true;
    if (!isAutoMic) {
      stopActiveListening();
      return;
    }

    if (!hasAutoStartedMicRef.current && !isListening && !isSpeaking && !isThinking) {
      hasAutoStartedMicRef.current = true;
      startVoiceListening();
    }

    const handleFirstUserGesture = () => {
      if (
        autoMicOpenRef.current &&
        !recognitionRef.current &&
        !isSpeakingRef.current &&
        !isThinkingRef.current &&
        !isCalibrationOpenRef.current
      ) {
        startListeningRef.current();
      }
    };

    window.addEventListener("pointerdown", handleFirstUserGesture, { once: true });
    window.addEventListener("keydown", handleFirstUserGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstUserGesture);
      window.removeEventListener("keydown", handleFirstUserGesture);
    };
  }, [
    loadingState,
    appState?.config?.autoMicOpen,
    isListening,
    isSpeaking,
    isThinking,
    startVoiceListening,
    stopActiveListening,
  ]);

  // Android Background Operation, Screen Wake Lock, Service Worker & Home Screen Quick Actions
  useEffect(() => {
    // 1. Register Service Worker for Android Background & Home Screen Notifications
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          if (backgroundMode && "Notification" in window && Notification.permission === "granted") {
            reg.active?.postMessage({
              type: "START_BACKGROUND_SERVICE",
              title: "Jarvis Active on Mobile",
              body: "Listening in background. Tap from Home Screen to give voice command.",
            });
          }
        })
        .catch(() => {});

      const onSwMessage = (event: MessageEvent) => {
        if (event.data?.type === "JARVIS_HOME_SCREEN_ACTION" && event.data?.action === "voice") {
          startListeningRef.current();
        }
      };
      navigator.serviceWorker.addEventListener("message", onSwMessage);
    }

    // 2. Capture Android "Add to Home Screen" install prompt
    const onBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    // 3. Battery Status API
    if ("getBattery" in navigator) {
      (navigator as any)
        .getBattery()
        .then((bat: any) => {
          const updateBat = () => {
            setBatteryStatus({
              level: Math.round((bat.level ?? 1) * 100),
              charging: Boolean(bat.charging),
            });
          };
          updateBat();
          bat.addEventListener("levelchange", updateBat);
          bat.addEventListener("chargingchange", updateBat);
        })
        .catch(() => {});
    }

    // 4. Handle Home Screen Quick Action Shortcuts (?action=voice, ?action=open_settings, etc.)
    const params = new URLSearchParams(window.location.search);
    const homeAction = params.get("action");
    if (homeAction === "voice") {
      setLastAndroidAction("Home Screen Voice Shortcut Triggered");
      window.setTimeout(() => startListeningRef.current(), 400);
    } else if (homeAction === "open_settings") {
      launchAndroidIntent(
        "intent:#Intent;action=android.settings.SETTINGS;end",
        undefined,
        "Android Settings"
      );
    } else if (homeAction === "quick_comm") {
      launchAndroidIntent(
        "intent://send#Intent;scheme=whatsapp;package=com.whatsapp;end",
        "https://wa.me/",
        "WhatsApp"
      );
    } else if (homeAction === "android_control") {
      setActiveTab("actions");
      setLastAndroidAction("Opened Android Control Center from Home Screen");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, [backgroundMode, launchAndroidIntent]);

  // Manage Screen Wake Lock + MediaSession Lock-Screen/Home-Screen Controls + Background Keep-Alive
  useEffect(() => {
    let cancelled = false;

    const acquireWakeLock = async () => {
      if (!backgroundMode || !("wakeLock" in navigator)) {
        if (wakeLockRef.current) {
          wakeLockRef.current.release().catch(() => {});
          wakeLockRef.current = null;
        }
        setWakeLockActive(false);
        return;
      }
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        if (!cancelled) setWakeLockActive(true);
        wakeLockRef.current.addEventListener("release", () => {
          if (!cancelled) setWakeLockActive(false);
        });
      } catch {
        if (!cancelled) setWakeLockActive(false);
      }
    };

    acquireWakeLock();

    // Setup Android MediaSession so Jarvis stays controllable from Home Screen / Notification Shade / Lock Screen
    if ("mediaSession" in navigator && backgroundMode) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "Jarvis Android Assistant",
          artist: isListening
            ? "🎤 Listening for Urdu / English Command"
            : "Active in Background & Home Screen",
          album: "Jarvis Personal AI",
          artwork: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          ],
        });
        navigator.mediaSession.setActionHandler("play", () => {
          startListeningRef.current();
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          stopActiveListening();
        });
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          startListeningRef.current();
        });
      } catch {
        // Ignore unsupported mediaSession handlers
      }
    }

    // Re-acquire Wake Lock and resume listening when returning from Home Screen or background
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (backgroundMode) acquireWakeLock();
        if (autoMicOpenRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
          scheduleAutoMicReopen(300);
        }
      } else if (backgroundMode) {
        // Keep background notification active while user is on Android Home Screen
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "START_BACKGROUND_SERVICE",
            title: "Jarvis Running in Background",
            body: "Tap to speak or control Android from Home Screen.",
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [backgroundMode, isListening, stopActiveListening, scheduleAutoMicReopen]);

  const toggleBackgroundMode = useCallback(async () => {
    const next = !backgroundMode;
    setBackgroundMode(next);
    if (next) {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission().catch(() => {});
      }
      // Start silent keep-alive audio loop on user gesture so Android keeps Jarvis alive on Home Screen
      try {
        if (!bgKeepAliveAudioRef.current) {
          const silentWav =
            "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
          const loopAudio = new Audio(silentWav);
          loopAudio.loop = true;
          loopAudio.volume = 0.01;
          bgKeepAliveAudioRef.current = loopAudio;
        }
        await bgKeepAliveAudioRef.current.play().catch(() => {});
      } catch {
        // Ignore audio error
      }
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        reg?.active?.postMessage({
          type: "START_BACKGROUND_SERVICE",
          title: "Jarvis Background & Home Screen Active",
          body: "Jarvis is active in the background. Tap anytime from your Home Screen.",
        });
      }
      setLastAndroidAction("Background & Home Screen Mode Enabled");
    } else {
      if (bgKeepAliveAudioRef.current) {
        bgKeepAliveAudioRef.current.pause();
      }
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        reg?.active?.postMessage({ type: "STOP_BACKGROUND_SERVICE" });
      }
      setLastAndroidAction("Background Mode Paused");
    }
  }, [backgroundMode]);

  // Helper mutations for Config, Memory, Reminders, Files, Plugins, Undo
  const updateServerSection = useCallback(async (section: string, action: string, payload: any) => {
    const res = await fetch("/api/jarvis/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, action, payload }),
    });
    if (res.ok) {
      const data = await res.json();
      setAppState((prev) =>
        prev ? { ...data.state, systemTelemetry: prev.systemTelemetry } : data.state
      );
    }
  }, []);

  const handleUpdateConfig = useCallback(
    async (partial: Partial<JarvisConfig>) => {
      await updateServerSection("config", "update", partial);
    },
    [updateServerSection]
  );

  const handleUndo = useCallback(async (undoId?: string) => {
    const res = await fetch("/api/jarvis/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ undoId }),
    });
    if (res.ok) {
      const data = await res.json();
      setAppState((prev) =>
        prev ? { ...data.state, systemTelemetry: prev.systemTelemetry } : data.state
      );
    }
  }, []);

  // Global Hotkeys (`core/hotkey.py`)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (e.key === "Escape" && isShortcutsOpen) {
        e.preventDefault();
        setIsShortcutsOpen(false);
        return;
      }

      if (!isEditable && e.key === "?" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      if (!e.altKey) return;
      const key = e.key.toLowerCase();

      if (key === "j") {
        e.preventDefault();
        toggleVoiceInput();
      } else if (key === "m") {
        e.preventDefault();
        const nextAuto = !(autoMicOpenRef.current ?? true);
        autoMicOpenRef.current = nextAuto;
        autoReplyRef.current = nextAuto;
        handleUpdateConfig({ autoMicOpen: nextAuto, autoReply: nextAuto, autoSpeak: true });
        if (nextAuto) {
          startVoiceListening();
        } else {
          stopActiveListening();
        }
      } else if (key === "s") {
        e.preventDefault();
        stopSpeaking(true);
      } else if (key === "c") {
        e.preventDefault();
        setIsCalibrationOpen((prev) => !prev);
      } else if (key === "z") {
        e.preventDefault();
        handleUndo();
      } else if (key === "/" || key === "?") {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (key === "1") {
        e.preventDefault();
        setActiveTab("hud");
      } else if (key === "2") {
        e.preventDefault();
        setActiveTab("actions");
      } else if (key === "3") {
        e.preventDefault();
        setActiveTab("vision_code");
      } else if (key === "4") {
        e.preventDefault();
        setActiveTab("memory_dashboard");
      } else if (key === "5") {
        e.preventDefault();
        setActiveTab("ai_providers");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isShortcutsOpen,
    toggleVoiceInput,
    handleUpdateConfig,
    startVoiceListening,
    stopActiveListening,
    stopSpeaking,
    handleUndo,
  ]);

  const handleAnalyzeVision = async (
    imageBase64: string,
    mimeType: string,
    prompt: string
  ): Promise<string> => {
    const res = await fetch("/api/jarvis/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType, prompt }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Vision scan failed");
    setAppState((prev) =>
      prev ? { ...data.state, systemTelemetry: prev.systemTelemetry } : data.state
    );
    if (appState?.config?.autoSpeak && data.analysis) {
      speakWithVisemes(data.analysis.slice(0, 320));
    }
    return data.analysis;
  };

  const handleSaveProvider = async (payload: any) => {
    const res = await fetch("/api/jarvis/providers/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save provider settings");
    setAppState((prev) =>
      prev ? { ...data.state, systemTelemetry: prev.systemTelemetry } : data.state
    );
  };

  const handleDeleteProviderKey = async (providerId: AIProviderId) => {
    const res = await fetch("/api/jarvis/providers/delete-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete API key");
    setAppState((prev) =>
      prev ? { ...data.state, systemTelemetry: prev.systemTelemetry } : data.state
    );
  };

  const handleTestProviderConnection = async (payload: {
    providerId: AIProviderId;
    apiKey?: string;
    model: string;
    customModel?: string;
    baseUrl?: string;
  }) => {
    const res = await fetch("/api/jarvis/providers/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.state) {
      setAppState((prev) =>
        prev ? { ...data.state, systemTelemetry: prev.systemTelemetry } : data.state
      );
    }
    return {
      ok: Boolean(data.ok),
      latencyMs: Number(data.latencyMs || 0),
      modelTested: String(data.modelTested || payload.model),
      message: String(data.message || "Test completed"),
    };
  };

  if (loadingState || !appState) {
    return (
      <div className="min-h-screen bg-[#070b12] text-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          <p className="text-sm font-display tracking-wider text-sky-300">
            INITIALIZING JARVIS...
          </p>
        </div>
      </div>
    );
  }

  const {
    config,
    providerSettings,
    memories,
    reminders,
    files,
    plugins,
    undoStack,
    actionLogs,
    messages,
    systemTelemetry,
  } = appState;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-[#070b12]/90 backdrop-blur-md border-b border-slate-800/90">
        {/* Zone 1: Single Text Element Brand Wordmark */}
        <a
          href="#hud"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("hud");
          }}
          className="text-lg font-bold font-display tracking-wider text-white whitespace-nowrap"
        >
          Jarvis
        </a>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <a
            href="#hud"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("hud");
            }}
            className={`transition-colors whitespace-nowrap ${
              activeTab === "hud"
                ? "text-sky-400 underline underline-offset-8 decoration-2"
                : "hover:text-white"
            }`}
          >
            Command HUD
          </a>
          <a
            href="#actions"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("actions");
            }}
            className={`transition-colors whitespace-nowrap ${
              activeTab === "actions"
                ? "text-sky-400 underline underline-offset-8 decoration-2"
                : "hover:text-white"
            }`}
          >
            Action Modules
          </a>
          <a
            href="#vision-code"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("vision_code");
            }}
            className={`transition-colors whitespace-nowrap ${
              activeTab === "vision_code"
                ? "text-sky-400 underline underline-offset-8 decoration-2"
                : "hover:text-white"
            }`}
          >
            Vision &amp; Code
          </a>
          <a
            href="#memory-dashboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("memory_dashboard");
            }}
            className={`transition-colors whitespace-nowrap ${
              activeTab === "memory_dashboard"
                ? "text-sky-400 underline underline-offset-8 decoration-2"
                : "hover:text-white"
            }`}
          >
            Memory &amp; Config
          </a>
          <a
            href="#ai-providers"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("ai_providers");
            }}
            className={`transition-colors whitespace-nowrap ${
              activeTab === "ai_providers"
                ? "text-sky-400 underline underline-offset-8 decoration-2"
                : "hover:text-white"
            }`}
          >
            OpenAI Key
          </a>
        </nav>

        {/* Zone 3: Primary Actions (Undo + Auto Mic Loop + Voice Command) */}
        <div className="flex items-center gap-2.5">
          {undoStack.length > 0 && (
            <button
              type="button"
              onClick={() => handleUndo()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/50 border border-amber-500/30 rounded-lg hover:bg-amber-900/50 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Undo ({undoStack.length})
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              const nextAuto = !(config.autoMicOpen ?? true);
              autoMicOpenRef.current = nextAuto;
              autoReplyRef.current = nextAuto;
              await handleUpdateConfig({
                autoMicOpen: nextAuto,
                autoReply: nextAuto,
                autoSpeak: nextAuto ? true : config.autoSpeak,
              });
              if (nextAuto) {
                startVoiceListening();
              } else {
                stopActiveListening();
              }
            }}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
              (config.autoMicOpen ?? true)
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title="Toggle Hands-Free Auto Mic Open & Auto Voice Reply"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                (config.autoMicOpen ?? true) ? "bg-emerald-400 animate-ping" : "bg-slate-600"
              }`}
            />
            Auto Mic 🎤 &amp; Reply: {(config.autoMicOpen ?? true) ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              isListening
                ? "bg-rose-500 text-white animate-pulse"
                : "bg-sky-400 text-slate-950 hover:bg-sky-300"
            }`}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            {isListening ? "Listening 🎤 (Stop)" : "Open Mic (Alt+J)"}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden items-center justify-around px-3 py-2 bg-slate-950 border-b border-slate-800 text-xs font-medium overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("hud")}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === "hud" ? "text-sky-400 bg-sky-950/50" : "text-slate-400"}`}
        >
          Command HUD
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("actions")}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === "actions" ? "text-sky-400 bg-sky-950/50" : "text-slate-400"}`}
        >
          Actions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("vision_code")}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === "vision_code" ? "text-sky-400 bg-sky-950/50" : "text-slate-400"}`}
        >
          Vision &amp; Code
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("memory_dashboard")}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === "memory_dashboard" ? "text-sky-400 bg-sky-950/50" : "text-slate-400"}`}
        >
          Memory
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ai_providers")}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === "ai_providers" ? "text-sky-400 bg-sky-950/50" : "text-slate-400"}`}
        >
          OpenAI Key
        </button>
      </div>

      {/* Error Alert Banner */}
      {errorBanner && (
        <div className="mx-6 mt-4 p-3 bg-rose-950/70 border border-rose-500/40 rounded-lg flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner("")}
            className="text-rose-300 hover:text-white font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Safety Confirmation Modal (core/confirm.py) */}
      {pendingConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/50 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-semibold text-white">{pendingConfirmation.title}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {pendingConfirmation.description}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingConfirmation(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
              >
                Abort Protocol
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (pendingConfirmation.payload?.fileName) {
                    await updateServerSection("files", "delete", {
                      name: pendingConfirmation.payload.fileName,
                    });
                  }
                  setPendingConfirmation(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg"
              >
                Authorize Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-5 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "hud" && (
            <motion.div
              key="tab-hud"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.06, delayChildren: 0.02 },
                },
                exit: {
                  opacity: 0,
                  y: -10,
                  transition: { duration: 0.18, ease: "easeInOut" },
                },
              }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* Left Column (4 Cols): 3D Face Mesh Avatar + System Settings & Telemetry */}
              <div className="lg:col-span-4 flex flex-col gap-5">
                {/* 3D Face Mesh & Viseme Lip-Sync Viewport */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, x: -28, y: 8 },
                    visible: {
                      opacity: 1,
                      x: 0,
                      y: 0,
                      transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                  className="bg-slate-900/70 border border-slate-800 rounded-xl h-[380px] flex flex-col overflow-hidden"
                >
                  <AvatarMesh3D
                    mode={config.avatarMode}
                    accent={config.hudAccent}
                    isSpeaking={isSpeaking}
                    isListening={isListening}
                    isThinking={isThinking}
                    audioLevel={audioLevel}
                    currentViseme={currentViseme}
                    statusText={statusText}
                    onToggleMode={() =>
                      handleUpdateConfig({
                        avatarMode: config.avatarMode === "face_mesh" ? "arc_core" : "face_mesh",
                      })
                    }
                  />
                </motion.div>

                {/* System Controls & Audio Status (actions/computer_settings.py & system_monitor.py) */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, x: -28, y: 12 },
                    visible: {
                      opacity: 1,
                      x: 0,
                      y: 0,
                      transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                  className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">
                      Workstation &amp; HUD Controls
                    </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                    <span>CPU {systemTelemetry.cpuPercent}%</span>
                    <span aria-hidden="true">·</span>
                    <span>RAM {systemTelemetry.memoryPercent}%</span>
                  </div>
                </div>

                {/* Volume & Brightness Sliders */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Master Volume</span>
                      <span className="font-mono tabular-nums text-sky-400">{config.volume}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={config.volume}
                      onChange={(e) => handleUpdateConfig({ volume: Number(e.target.value) })}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>HUD Luminance</span>
                      <span className="font-mono tabular-nums text-sky-400">
                        {config.brightness}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={config.brightness}
                      onChange={(e) => handleUpdateConfig({ brightness: Number(e.target.value) })}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Mic Gain</span>
                      <span className="font-mono tabular-nums text-sky-400">
                        {config.micGain ?? 100}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={200}
                      step={5}
                      value={config.micGain ?? 100}
                      onChange={(e) => handleUpdateConfig({ micGain: Number(e.target.value) })}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>TTS Cadence</span>
                      <span className="font-mono tabular-nums text-sky-400">
                        {(config.ttsSpeed ?? 1.0).toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.7}
                      max={1.5}
                      step={0.05}
                      value={config.ttsSpeed ?? 1.0}
                      onChange={(e) => handleUpdateConfig({ ttsSpeed: Number(e.target.value) })}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Direct Voice Switcher (Male ♂ / Female ♀ · Urdu & English) */}
                <div className="pt-2.5 border-t border-slate-800/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                      Jarvis Voice (مردانہ ♂ / زنانہ ♀)
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border ${
                        getVoiceProfile(config.voiceName).gender === "male"
                          ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                          : "bg-pink-500/15 text-pink-300 border-pink-500/30"
                      }`}
                    >
                      {getVoiceProfile(config.voiceName).gender === "male"
                        ? "♂ MALE VOICE"
                        : "♀ FEMALE VOICE"}
                    </span>
                  </div>

                  {/* Quick One-Tap Preset Pills for Urdu Male, Deep Urdu Male, Classic Male, Urdu Female */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: "UrduMale_Asad" as JarvisVoiceId, short: "♂ Asad (Urdu)" },
                      { id: "UrduMale_Farhan" as JarvisVoiceId, short: "♂ Farhan (Deep)" },
                      { id: "Fenrir" as JarvisVoiceId, short: "♂ Fenrir (UK)" },
                      { id: "UrduFemale_Zoya" as JarvisVoiceId, short: "♀ Zoya (Urdu)" },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={async () => {
                          await handleUpdateConfig({ voiceName: preset.id });
                          const p = getVoiceProfile(preset.id);
                          speakWithVisemes(p.sampleText, preset.id, config.ttsSpeed ?? 1.0);
                        }}
                        className={`px-2 py-1.5 text-[11px] font-medium rounded-lg border transition-colors truncate ${
                          config.voiceName === preset.id
                            ? "bg-sky-500/20 border-sky-400 text-sky-200"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {preset.short}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={getVoiceProfile(config.voiceName).id}
                      onChange={async (e) => {
                        const nextVoice = normalizeVoiceId(e.target.value);
                        await handleUpdateConfig({ voiceName: nextVoice });
                        const p = getVoiceProfile(nextVoice);
                        speakWithVisemes(p.sampleText, nextVoice, config.ttsSpeed ?? 1.0);
                      }}
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-sky-400"
                    >
                      <optgroup label="♂ Male Voices (مردانہ آوازیں - Urdu & English)">
                        {JARVIS_VOICE_PROFILES.filter((v) => v.gender === "male").map((v) => (
                          <option key={v.id} value={v.id}>
                            ♂ {v.label} — {v.urduLabel}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="♀ Female Voices (زنانہ آوازیں - Urdu & English)">
                        {JARVIS_VOICE_PROFILES.filter((v) => v.gender === "female").map((v) => (
                          <option key={v.id} value={v.id}>
                            ♀ {v.label} — {v.urduLabel}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const p = getVoiceProfile(config.voiceName);
                        speakWithVisemes(p.sampleText, p.id, config.ttsSpeed ?? 1.0);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      title="Test selected voice"
                    >
                      <Play className="w-3 h-3" />
                      Test Voice
                    </button>
                  </div>
                </div>

                {/* Guided Audio & TTS Calibration Module Launcher */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 font-mono tabular-nums truncate">
                    Floor: {config.noiseFloorDb ?? -48} dB · {getVoiceProfile(config.voiceName).urduLabel}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCalibrationOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Auto-Calibrate Audio &amp; TTS
                  </button>
                </div>

                {/* Quick Hardware & Voice Toggles (Auto Mic 🎤 + Auto Reply + HUD Theme) */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const nextAutoMic = !(config.autoMicOpen ?? true);
                      autoMicOpenRef.current = nextAutoMic;
                      await handleUpdateConfig({ autoMicOpen: nextAutoMic });
                      if (nextAutoMic) {
                        startVoiceListening();
                      } else {
                        stopActiveListening();
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      (config.autoMicOpen ?? true)
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {(config.autoMicOpen ?? true) ? "Auto Mic ON" : "Auto Mic OFF"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateConfig({
                        autoReply: !(config.autoReply ?? true),
                        autoSpeak: !(config.autoReply ?? true),
                      })
                    }
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      (config.autoReply ?? true) && config.autoSpeak
                        ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    {config.autoSpeak ? (
                      <Volume2 className="w-3.5 h-3.5" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5" />
                    )}
                    {(config.autoReply ?? true) && config.autoSpeak
                      ? "Auto Reply ON"
                      : "Reply Muted"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const order: Array<"cyan" | "amber" | "emerald"> = [
                        "cyan",
                        "amber",
                        "emerald",
                      ];
                      const next = order[(order.indexOf(config.hudAccent) + 1) % order.length];
                      handleUpdateConfig({ hudAccent: next });
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-lg border bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700 transition-colors whitespace-nowrap capitalize"
                  >
                    <Cpu className="w-3.5 h-3.5 text-sky-400" />
                    {config.hudAccent} HUD
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Center Column (5 Cols): Jarvis Neural Conversation & Command Console */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 24, scale: 0.985 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
                },
              }}
              className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col h-[610px]"
            >
              {/* Console Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base font-semibold text-white">
                      Jarvis Command Console
                    </h1>
                    <button
                      type="button"
                      onClick={() => setActiveTab("ai_providers")}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-500/30 rounded transition-colors"
                      title="Configure Primary OpenAI API Key"
                    >
                      <KeyRound className="w-3 h-3 text-sky-400" />
                      <span>
                        OpenAI · {providerSettings?.providers?.openai?.model || "gpt-4o-mini"}
                      </span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    English &amp; Roman Urdu / اردو · Primary OpenAI Engine
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSpeaking && (
                    <button
                      type="button"
                      onClick={() => stopSpeaking(true)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-300 bg-rose-950/60 border border-rose-500/30 rounded hover:bg-rose-900/60 whitespace-nowrap"
                    >
                      <Square className="w-3 h-3" />
                      Stop Audio
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => updateServerSection("clear_chat", "clear", {})}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded whitespace-nowrap"
                  >
                    Reset Log
                  </button>
                </div>
              </div>

              {/* Quick Command Starters (Urdu / Roman Urdu / English) */}
              <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => sendCommand("Jarvis, Urdu mein jawab do")}
                  className="px-2.5 py-1 text-xs text-sky-300 bg-sky-950/50 hover:bg-sky-900/50 border border-sky-500/30 rounded whitespace-nowrap shrink-0"
                >
                  🇵🇰 Urdu mein jawab do
                </button>
                <button
                  type="button"
                  onClick={() => sendCommand("Jarvis, Karachi aur Lahore ka mausam kaisa hai?")}
                  className="px-2.5 py-1 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded whitespace-nowrap shrink-0"
                >
                  Karachi ka mausam?
                </button>
                <button
                  type="button"
                  onClick={() => sendCommand("Jarvis, 20 minute baad meeting ka reminder set karo")}
                  className="px-2.5 py-1 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded whitespace-nowrap shrink-0"
                >
                  ⏰ Set Reminder
                </button>
                <button
                  type="button"
                  onClick={() => sendCommand("Jarvis, English mein baat karo")}
                  className="px-2.5 py-1 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded whitespace-nowrap shrink-0"
                >
                  🇬🇧 Speak English
                </button>
              </div>

              {/* Conversation Feed */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[92%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                        m.role === "user"
                          ? "bg-sky-500 text-slate-950 font-medium"
                          : "bg-slate-950/90 border border-slate-800 text-slate-200"
                      }`}
                    >
                      {m.role === "assistant" && (
                        <div className="flex items-center justify-between gap-3 mb-1 text-[11px] text-slate-400 flex-wrap">
                          <span className="font-semibold text-sky-400">Jarvis</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => speakWithVisemes(m.text)}
                              className="text-slate-400 hover:text-sky-300"
                              title="Speak response with 3D lip-sync"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="whitespace-pre-wrap">{m.text}</div>

                      {/* Tool Execution Inline Cards */}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2">
                          {m.attachments.map((att, idx) => {
                            if (att.type === "flights" && att.data?.flights) {
                              return (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg"
                                >
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300 mb-2">
                                    <Plane className="w-3.5 h-3.5" />
                                    Flight Telemetry: {att.data.origin} → {att.data.destination}
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    {att.data.flights.map((fl: any) => (
                                      <div
                                        key={fl.flightNo}
                                        className="flex items-center justify-between text-[11px] py-1 border-b border-slate-800/60 last:border-0 font-mono tabular-nums"
                                      >
                                        <span className="text-white font-semibold">
                                          {fl.flightNo} ({fl.airline})
                                        </span>
                                        <span className="text-slate-300">
                                          {fl.departure} - {fl.arrival}
                                        </span>
                                        <span className="text-emerald-400">${fl.priceUsd}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            if (att.type === "code" && att.data?.code) {
                              return (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg"
                                >
                                  <div className="flex items-center justify-between text-[11px] text-sky-300 mb-1.5 font-mono">
                                    <span className="flex items-center gap-1">
                                      <Code2 className="w-3.5 h-3.5" />
                                      {att.data.fileName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setActiveTab("vision_code")}
                                      className="underline hover:text-white"
                                    >
                                      Open in Sandbox
                                    </button>
                                  </div>
                                  <pre className="p-2 bg-slate-950 rounded text-[11px] font-mono text-slate-300 overflow-x-auto max-h-40">
                                    {att.data.code}
                                  </pre>
                                </div>
                              );
                            }

                            return null;
                          })}
                        </div>
                      )}

                      {/* Grounded Web Search Citations */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="text-slate-400">Sources:</span>
                          {m.citations.slice(0, 3).map((cit, i) => (
                            <a
                              key={i}
                              href={cit.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sky-400 hover:underline truncate max-w-[180px]"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{cit.title}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-center gap-2 text-xs text-sky-300 px-2">
                    <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span>Jarvis is processing your command...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Command Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!inputPrompt.trim()) return;
                  const q = inputPrompt;
                  setInputPrompt("");
                  sendCommand(q);
                }}
                className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setUseWebSearch(!useWebSearch)}
                  title="Toggle Google Search Grounding"
                  className={`p-2 rounded-lg border transition-colors ${
                    useWebSearch
                      ? "bg-sky-500/20 border-sky-500/40 text-sky-300"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                </button>

                <select
                  value={speechLangMode}
                  onChange={(e) =>
                    setSpeechLangMode(e.target.value as "auto" | "ur-PK" | "en-US")
                  }
                  title="Speech Recognition Language (Urdu / English / Auto)"
                  className="px-2 py-2 text-[11px] bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="auto">🎤 Auto (Urdu/EN)</option>
                  <option value="ur-PK">🇵🇰 اردو (ur-PK)</option>
                  <option value="en-US">🇬🇧 English (en-US)</option>
                </select>

                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Command Jarvis in Urdu, Roman Urdu, or English..."
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />

                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2 rounded-lg border transition-colors ${
                    isListening
                      ? "bg-rose-500 border-rose-400 text-white animate-pulse"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                  }`}
                  title="Speak Command"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  type="submit"
                  disabled={isThinking || !inputPrompt.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  Execute
                </button>
              </form>
            </motion.div>

            {/* Right Column (3 Cols): Weather Telemetry, Reminders & Media Stream */}
            <div className="lg:col-span-3 flex flex-col gap-5">
              {/* Weather Telemetry Widget (actions/weather_report.py) */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, x: 28, y: 8 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CloudSun className="w-4 h-4 text-sky-400" />
                    <h2 className="text-sm font-semibold text-white">Weather Telemetry</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {weatherData.city}, {weatherData.country}
                  </span>
                </div>

                <div className="flex items-baseline justify-between py-1">
                  <div className="text-3xl font-bold font-mono tabular-nums text-white">
                    {weatherData.tempC}°C
                  </div>
                  <div className="text-xs text-slate-300 text-right">
                    <div>{weatherData.condition}</div>
                    <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                      Humidity {weatherData.humidity}% · Wind {weatherData.windKmh} km/h
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (weatherCityInput.trim()) fetchWeather(weatherCityInput.trim());
                  }}
                  className="flex gap-1.5"
                >
                  <input
                    type="text"
                    value={weatherCityInput}
                    onChange={(e) => setWeatherCityInput(e.target.value)}
                    placeholder="City..."
                    className="flex-1 min-w-0 px-2.5 py-1 text-xs bg-slate-950 border border-slate-800 rounded text-slate-200"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-xs font-medium text-sky-300 bg-sky-950/60 border border-sky-500/30 rounded hover:bg-sky-900/50 whitespace-nowrap"
                  >
                    Scan
                  </button>
                </form>
              </motion.div>

              {/* Android All-Control, Home Screen & Background Hub */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, x: 28, y: 12 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-sky-400" />
                    <h2 className="text-sm font-semibold text-white">
                      Android Control &amp; Background
                    </h2>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border ${
                      backgroundMode
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {backgroundMode ? "BG ACTIVE" : "BG PAUSED"}
                  </span>
                </div>

                {/* Background & Home Screen Mode Controls */}
                <div className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Radio
                        className={`w-3.5 h-3.5 ${
                          backgroundMode ? "text-emerald-400 animate-pulse" : "text-slate-500"
                        }`}
                      />
                      Mobile Background &amp; Home Screen
                    </span>
                    <span className="font-mono text-[10px] text-sky-400">
                      <BatteryCharging className="w-3 h-3 inline mr-0.5" />
                      {batteryStatus.level}% {wakeLockActive ? "· WakeLock" : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={toggleBackgroundMode}
                      className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors ${
                        backgroundMode
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      {backgroundMode ? "✓ Background ON" : "Enable Background"}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (deferredInstallPrompt) {
                          deferredInstallPrompt.prompt();
                          await deferredInstallPrompt.userChoice.catch(() => {});
                          setDeferredInstallPrompt(null);
                          setLastAndroidAction("Added Jarvis to Android Home Screen");
                        } else {
                          if ("Notification" in window && Notification.permission !== "granted") {
                            await Notification.requestPermission().catch(() => {});
                          }
                          await toggleBackgroundMode();
                          setLastAndroidAction(
                            "Home Screen Notification & Shortcuts Active (Use Browser Menu -> Add to Home screen)"
                          );
                        }
                      }}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 rounded-lg transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Home Screen Setup
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-400 truncate font-mono">
                    {lastAndroidAction}
                  </div>
                </div>

                {/* Direct Android System Settings Intents */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Android System Settings
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      {
                        label: "Wi-Fi Settings",
                        icon: Wifi,
                        intent: "intent:#Intent;action=android.settings.WIFI_SETTINGS;end",
                      },
                      {
                        label: "Bluetooth",
                        icon: Bluetooth,
                        intent: "intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end",
                      },
                      {
                        label: "Location / GPS",
                        icon: MapPin,
                        intent:
                          "intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end",
                      },
                      {
                        label: "Sound & Audio",
                        icon: Volume2,
                        intent: "intent:#Intent;action=android.settings.SOUND_SETTINGS;end",
                      },
                      {
                        label: "Display",
                        icon: Sliders,
                        intent: "intent:#Intent;action=android.settings.DISPLAY_SETTINGS;end",
                      },
                      {
                        label: "Battery Saver",
                        icon: BatteryCharging,
                        intent:
                          "intent:#Intent;action=android.settings.BATTERY_SAVER_SETTINGS;end",
                      },
                      {
                        label: "Accessibility",
                        icon: ShieldAlert,
                        intent:
                          "intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end",
                      },
                      {
                        label: "Phone Settings",
                        icon: Settings,
                        intent: "intent:#Intent;action=android.settings.SETTINGS;end",
                      },
                    ].map((item) => {
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => launchAndroidIntent(item.intent, undefined, item.label)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-slate-200 bg-slate-950/90 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors text-left truncate"
                        >
                          <IconComp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Direct Android App & Hardware Launchers */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Quick Android Apps &amp; Actions
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      {
                        label: "WhatsApp",
                        icon: Send,
                        intent: "intent://send#Intent;scheme=whatsapp;package=com.whatsapp;end",
                        fallback: "https://wa.me/",
                      },
                      {
                        label: "Open Camera",
                        icon: Camera,
                        intent: "intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end",
                      },
                      {
                        label: "Phone Dialer",
                        icon: PhoneCall,
                        intent: "tel:",
                        fallback: "tel:",
                      },
                      {
                        label: "Google Maps",
                        icon: MapPin,
                        intent: "geo:0,0?q=Karachi",
                        fallback: "https://maps.google.com",
                      },
                      {
                        label: "Chrome Browser",
                        icon: Globe,
                        intent:
                          "intent://www.google.com#Intent;scheme=https;package=com.android.chrome;end",
                        fallback: "https://www.google.com",
                      },
                      {
                        label: "YouTube App",
                        icon: Play,
                        intent:
                          "intent://www.youtube.com#Intent;scheme=https;package=com.google.android.youtube;end",
                        fallback: "https://m.youtube.com",
                      },
                    ].map((app) => {
                      const IconComp = app.icon;
                      return (
                        <button
                          key={app.label}
                          type="button"
                          onClick={() => launchAndroidIntent(app.intent, app.fallback, app.label)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-sky-200 bg-sky-950/30 hover:bg-sky-900/40 border border-sky-500/25 rounded-lg transition-colors text-left truncate"
                        >
                          <IconComp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate">{app.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
          )}

          {activeTab === "actions" && (
            <motion.div
              key="tab-actions"
              initial={{ opacity: 0, x: 24, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -20, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <ActionsAndPluginsView
                plugins={plugins}
                onExecutePrompt={async (prompt, search) => {
                  setActiveTab("hud");
                  await sendCommand(prompt, search);
                }}
                onTogglePlugin={async (id) => {
                  await updateServerSection("plugins", "toggle", { id });
                }}
                onCreatePlugin={async (plugin) => {
                  await updateServerSection("plugins", "add", plugin);
                }}
              />
            </motion.div>
          )}

          {activeTab === "vision_code" && (
            <motion.div
              key="tab-vision-code"
              initial={{ opacity: 0, x: 24, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -20, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <VisionAndCodeView
                files={files}
                onSaveFile={async (file) => {
                  await updateServerSection("files", "save", file);
                }}
                onDeleteFile={async (file: JarvisFile) => {
                  if (config.confirmDestructive) {
                    setPendingConfirmation({
                      title: `Confirm File Deletion: ${file.name}`,
                      description: `Jarvis safety protocol requires authorization before deleting "${file.name}".`,
                      payload: { fileName: file.name },
                    });
                  } else {
                    await updateServerSection("files", "delete", { id: file.id });
                  }
                }}
                onAnalyzeVision={handleAnalyzeVision}
                onRunCommandPrompt={async (prompt) => {
                  setActiveTab("hud");
                  await sendCommand(prompt);
                }}
              />
            </motion.div>
          )}

          {activeTab === "memory_dashboard" && (
            <motion.div
              key="tab-memory-dashboard"
              initial={{ opacity: 0, x: 24, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -20, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <DashboardAndMemoryView
                config={config}
                memories={memories}
                undoStack={undoStack}
                actionLogs={actionLogs}
                telemetry={systemTelemetry}
                onUpdateConfig={handleUpdateConfig}
                onAddMemory={async (category, content) => {
                  await updateServerSection("memories", "add", { category, content });
                }}
                onDeleteMemory={async (id) => {
                  await updateServerSection("memories", "delete", { id });
                }}
                onUndo={handleUndo}
                onTestVoice={() =>
                  speakWithVisemes(
                    `Assalam-o-Alaikum, ${config.userTitle}. Jarvis voice synthesis and 3D face mesh lip-sync are operating at peak efficiency. Aap ka hukum sar aankhon par.`
                  )
                }
                onOpenCalibration={() => setIsCalibrationOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === "ai_providers" && providerSettings && (
            <motion.div
              key="tab-ai-providers"
              initial={{ opacity: 0, x: 24, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -20, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <AIProviderSettingsView
                settings={providerSettings}
                onSaveProvider={handleSaveProvider}
                onDeleteKey={handleDeleteProviderKey}
                onTestConnection={handleTestProviderConnection}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Automated Audio & TTS Calibration Modal */}
      <AudioCalibrationModal
        isOpen={isCalibrationOpen}
        config={config}
        onClose={() => setIsCalibrationOpen(false)}
        onSaveCalibration={async (calibrated) => {
          await updateServerSection("config", "calibrate", calibrated);
        }}
        onAuditionVoice={async (text, voice, speed) => {
          await speakWithVisemes(text, voice, speed);
        }}
      />
    </div>
  );
}
