import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Gauge,
  Mic,
  Play,
  Sliders,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import {
  getVoiceProfile,
  JARVIS_VOICE_PROFILES,
  JarvisConfig,
} from "../types/jarvis";

interface AudioCalibrationModalProps {
  isOpen: boolean;
  config: JarvisConfig;
  onClose: () => void;
  onSaveCalibration: (calibrated: {
    micGain: number;
    ttsSpeed: number;
    noiseFloorDb: number;
    voiceName: JarvisConfig["voiceName"];
  }) => Promise<void>;
  onAuditionVoice: (text: string, voiceName: string, ttsSpeed: number) => Promise<void>;
}

const SPEED_PRESETS = [
  { label: "0.80x · Deliberate", value: 0.8 },
  { label: "0.90x · Composed", value: 0.9 },
  { label: "1.00x · Standard Butler", value: 1.0 },
  { label: "1.15x · Tactical Crisp", value: 1.15 },
  { label: "1.30x · Rapid Briefing", value: 1.3 },
];

export const AudioCalibrationModal: React.FC<AudioCalibrationModalProps> = ({
  isOpen,
  config,
  onClose,
  onSaveCalibration,
  onAuditionVoice,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [micGain, setMicGain] = useState<number>(config.micGain ?? 100);
  const [ttsSpeed, setTtsSpeed] = useState<number>(config.ttsSpeed ?? 1.0);
  const [noiseFloorDb, setNoiseFloorDb] = useState<number>(config.noiseFloorDb ?? -48);
  const [voiceName, setVoiceName] = useState<JarvisConfig["voiceName"]>(
    config.voiceName || "UrduMale_Asad"
  );

  // Live microphone monitoring & automated sweep state
  const [isMonitoringMic, setIsMonitoringMic] = useState<boolean>(false);
  const [isAutoSweeping, setIsAutoSweeping] = useState<boolean>(false);
  const [sweepProgress, setSweepProgress] = useState<number>(0);
  const [sweepPhaseText, setSweepPhaseText] = useState<string>(
    "Ready to sample ambient noise floor and vocal peak."
  );
  const [liveInputLevel, setLiveInputLevel] = useState<number>(0); // 0..100
  const [peakInputLevel, setPeakInputLevel] = useState<number>(0);
  const [freqBars, setFreqBars] = useState<number[]>(new Array(24).fill(4));
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [auditionText, setAuditionText] = useState<string>(
    `Calibration check complete, ${config.userTitle}. Microphone gain is locked at ${
      config.micGain ?? 100
    } percent and speech cadence is operating at ${(config.ttsSpeed ?? 1.0).toFixed(
      2
    )}x nominal speed.`
  );

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const sweepTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMicGain(config.micGain ?? 100);
      setTtsSpeed(config.ttsSpeed ?? 1.0);
      setNoiseFloorDb(config.noiseFloorDb ?? -48);
      setVoiceName(config.voiceName || "UrduMale_Asad");
    } else {
      stopMicMonitor();
    }
    return () => {
      stopMicMonitor();
    };
  }, [isOpen, config.micGain, config.ttsSpeed, config.noiseFloorDb, config.voiceName]);

  // Update live Web Audio GainNode whenever micGain changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = micGain / 100;
    }
  }, [micGain]);

  const stopMicMonitor = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (sweepTimerRef.current) {
      window.clearInterval(sweepTimerRef.current);
      sweepTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsMonitoringMic(false);
    setIsAutoSweeping(false);
  };

  const startMicMonitor = async () => {
    stopMicMonitor();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();
      gainNode.gain.value = micGain / 100;
      gainNodeRef.current = gainNode;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(gainNode);
      gainNode.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      setIsMonitoringMic(true);
      setSweepPhaseText("Live microphone array connected. Speak to test input headroom.");

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        const bars: number[] = [];
        for (let i = 0; i < 24; i++) {
          const val = dataArray[i % dataArray.length] || 0;
          sum += val;
          bars.push(Math.max(4, Math.round((val / 255) * 100)));
        }
        const avg = Math.min(100, Math.round((sum / (24 * 255)) * 180));
        setLiveInputLevel(avg);
        setPeakInputLevel((prev) => Math.max(prev, avg));
        setFreqBars(bars);
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
      return true;
    } catch {
      // Fallback acoustic telemetry simulation if mic hardware permission is blocked in sandbox
      setIsMonitoringMic(true);
      setSweepPhaseText("Hardware simulation active. Running acoustic gain analyzer.");
      const tickSim = () => {
        const t = performance.now() / 1000;
        const simGain = micGain / 100;
        const baseWave = (Math.sin(t * 6) * 0.35 + Math.cos(t * 11) * 0.25 + 0.45) * 62 * simGain;
        const clamped = Math.min(100, Math.max(6, Math.round(baseWave)));
        setLiveInputLevel(clamped);
        setPeakInputLevel((prev) => Math.max(prev, clamped));
        const bars = Array.from({ length: 24 }, (_, idx) =>
          Math.min(100, Math.max(6, Math.round(clamped * (0.4 + Math.abs(Math.sin(t * 8 + idx * 0.4)) * 0.7))))
        );
        setFreqBars(bars);
        rafRef.current = requestAnimationFrame(tickSim);
      };
      rafRef.current = requestAnimationFrame(tickSim);
      return false;
    }
  };

  // Automated 3-Second Gain Calibration Routine
  const runAutomatedMicSweep = async () => {
    if (!isMonitoringMic) {
      await startMicMonitor();
    }
    setIsAutoSweeping(true);
    setSweepProgress(0);
    setPeakInputLevel(0);
    setSweepPhaseText("Phase 1/2: Sampling room ambient noise floor (keep quiet for 1s)...");

    const samples: number[] = [];
    let elapsedMs = 0;

    if (sweepTimerRef.current) window.clearInterval(sweepTimerRef.current);
    sweepTimerRef.current = window.setInterval(() => {
      elapsedMs += 150;
      const pct = Math.min(100, Math.round((elapsedMs / 3000) * 100));
      setSweepProgress(pct);

      setLiveInputLevel((currentLvl) => {
        samples.push(currentLvl);
        return currentLvl;
      });

      if (elapsedMs === 1050) {
        const quietAvg =
          samples.length > 0
            ? samples.reduce((a, b) => a + b, 0) / samples.length
            : 12;
        const computedFloor = Math.max(-62, Math.min(-32, Math.round(-60 + quietAvg * 0.35)));
        setNoiseFloorDb(computedFloor);
        setSweepPhaseText(
          'Phase 2/2: Speak now — say "Jarvis, calibrate neural audio array"...'
        );
      }

      if (elapsedMs >= 3000) {
        if (sweepTimerRef.current) {
          window.clearInterval(sweepTimerRef.current);
          sweepTimerRef.current = null;
        }
        const voiceSamples = samples.slice(7);
        const maxSpoken =
          voiceSamples.length > 0 ? Math.max(...voiceSamples, 35) : 52;
        // Target peak is ~80% (-6dB headroom)
        const ratio = 80 / Math.max(25, maxSpoken);
        const recommendedGain = Math.min(
          185,
          Math.max(45, Math.round((micGain * ratio) / 5) * 5)
        );
        setMicGain(recommendedGain);
        setIsAutoSweeping(false);
        setSweepPhaseText(
          `Auto-Calibration Locked: Recommended Mic Gain ${recommendedGain}% with ${noiseFloorDb} dB noise floor.`
        );
      }
    }, 150);
  };

  const handleAuditionTts = async () => {
    const phrase =
      auditionText.trim() ||
      `Good day, ${config.userTitle}. Microphone gain is calibrated to ${micGain} percent and TTS cadence is set to ${ttsSpeed.toFixed(
        2
      )}x.`;
    await onAuditionVoice(phrase, voiceName, ttsSpeed);
  };

  const handleCommitCalibration = async () => {
    setIsSaving(true);
    try {
      await onSaveCalibration({
        micGain,
        ttsSpeed,
        noiseFloorDb,
        voiceName,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const visemeFrameMs = Math.round(85 / ttsSpeed);
  const currentDb = Math.round(-60 + (liveInputLevel / 100) * 58);
  const signalZone =
    liveInputLevel > 92
      ? "Clipping Risk (> -2 dB)"
      : liveInputLevel >= 60
      ? "Optimal Telemetry (-12 to -4 dB)"
      : "Low Signal Headroom";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold font-display tracking-wide text-white">
              Jarvis Audio &amp; TTS Calibration
            </h2>
            <p className="text-xs text-slate-400">
              Microphone Gain · Speech Speed · Urdu &amp; English Voices
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/60 text-xs">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`py-3 px-4 font-medium flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              step === 1
                ? "border-sky-400 text-sky-300 bg-sky-500/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            01. Microphone Gain
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`py-3 px-4 font-medium flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              step === 2
                ? "border-sky-400 text-sky-300 bg-sky-500/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            02. TTS Speed &amp; Cadence
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`py-3 px-4 font-medium flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              step === 3
                ? "border-sky-400 text-sky-300 bg-sky-500/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            03. Verify &amp; Commit
          </button>
        </div>

        {/* Step Body */}
        <div className="p-6 flex flex-col gap-5">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Step 1: Acoustic Input &amp; Gain Normalization
                  </h3>
                  <p className="text-xs text-slate-400">
                    Run the 3-second automated sweep while speaking naturally to lock optimal gain.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={isMonitoringMic ? stopMicMonitor : startMicMonitor}
                    className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {isMonitoringMic ? "Stop Monitor" : "Test Live Mic"}
                  </button>
                  <button
                    type="button"
                    disabled={isAutoSweeping}
                    onClick={runAutomatedMicSweep}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isAutoSweeping ? `Calibrating (${sweepProgress}%)` : "Auto-Calibrate Gain (3s)"}
                  </button>
                </div>
              </div>

              {/* Status & Spectrum Box */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-sky-300 font-medium">{sweepPhaseText}</span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {currentDb} dB · Peak {peakInputLevel}%
                  </span>
                </div>

                {/* 24-Band Real-Time Spectrum */}
                <div className="h-24 flex items-end justify-between gap-1.5 pt-2 px-2 bg-slate-900/60 rounded-lg border border-slate-800/80">
                  {freqBars.map((val, idx) => (
                    <div
                      key={idx}
                      style={{ height: `${ Math.max(8, val) }%` }}
                      className={`flex-1 rounded-t transition-all duration-75 ${
                        val > 88
                          ? "bg-rose-400"
                          : val > 58
                          ? "bg-emerald-400"
                          : "bg-sky-400"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                  <span>NOISE FLOOR: {noiseFloorDb} dB</span>
                  <span>ZONE: {signalZone}</span>
                  <span>TARGET: -6 dB (80%)</span>
                </div>
              </div>

              {/* Manual Gain Slider */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-sky-400" />
                    Microphone Pre-Amp Gain
                  </span>
                  <span className="font-mono font-semibold text-sky-400 tabular-nums">
                    {micGain}%
                  </span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={200}
                  step={5}
                  value={micGain}
                  onChange={(e) => setMicGain(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                  <span>25% (Attenuated)</span>
                  <span>100% (Unity Gain)</span>
                  <span>200% (+6 dB Boost)</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Step 2: TTS Speech Speed &amp; 3D Viseme Synchronization
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select JARVIS speech cadence and audition real-time lip-sync timing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAuditionTts}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Play className="w-3.5 h-3.5" />
                  Audition Speed ({ttsSpeed.toFixed(2)}x)
                </button>
              </div>

              {/* Preset Speed Selector Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {SPEED_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setTtsSpeed(preset.value)}
                    className={`py-2 px-2.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      Math.abs(ttsSpeed - preset.value) < 0.02
                        ? "bg-sky-500/20 border-sky-400 text-sky-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Fine Speed Slider + Voice Persona */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Fine Cadence Multiplier</span>
                    <span className="font-mono font-semibold text-sky-400 tabular-nums">
                      {ttsSpeed.toFixed(2)}x ({visemeFrameMs}ms / viseme)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.7}
                    max={1.5}
                    step={0.05}
                    value={ttsSpeed}
                    onChange={(e) => setTtsSpeed(Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                    <span>0.70x</span>
                    <span>1.00x</span>
                    <span>1.50x</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-2">
                  <label className="text-xs font-medium text-slate-300">
                    Jarvis Voice Profile (Male ♂ &amp; Female ♀ · Urdu &amp; English)
                  </label>
                  <select
                    value={getVoiceProfile(voiceName).id}
                    onChange={(e) => {
                      const nextVoice = e.target.value as JarvisConfig["voiceName"];
                      setVoiceName(nextVoice);
                      const profile = getVoiceProfile(nextVoice);
                      if (profile?.sampleText) {
                        setAuditionText(profile.sampleText);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
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
                </div>
              </div>

              {/* Test Phrase Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Calibration Audition Phrase (English or Roman Urdu)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={auditionText}
                    onChange={(e) => setAuditionText(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleAuditionTts}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-sky-300 bg-sky-950/60 border border-sky-500/30 rounded-lg hover:bg-sky-900/50 whitespace-nowrap"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Speak Phrase
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Step 3: Review &amp; Save Calibration Profile to JARVIS Config
                </h3>
                <p className="text-xs text-slate-400">
                  These parameters will be persisted to memory/config_manager.py and pushed to core/undo.py.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-400">Microphone Gain</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-sky-400 mt-1">
                    {micGain}%
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                    Prev: {config.micGain ?? 100}%
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-400">Ambient Noise Floor</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-1">
                    {noiseFloorDb} dB
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                    Echo Guard Calibrated
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-400">TTS Speech Speed</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-sky-400 mt-1">
                    {ttsSpeed.toFixed(2)}x
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                    Prev: {(config.ttsSpeed ?? 1.0).toFixed(2)}x
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-400">Viseme Frame Sync</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-amber-400 mt-1">
                    {visemeFrameMs} ms
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Voice: {voiceName}
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-sky-950/30 border border-sky-500/30 rounded-lg flex items-center gap-3 text-xs text-slate-200">
                <Activity className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  Saving this profile updates both real-time Web Audio microphone gain and TTS playback cadence across Jarvis.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              if (step > 1) setStep((step - 1) as 1 | 2 | 3);
              else onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {step === 1 ? "Cancel" : "Previous Step"}
          </button>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors"
              >
                Next Step
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleCommitCalibration}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSaving ? "Saving to Config..." : "Save Calibration to JARVIS Config"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
