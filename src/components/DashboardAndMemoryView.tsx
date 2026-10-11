import React, { useEffect, useState } from "react";
import {
  Brain,
  CheckCircle2,
  Cpu,
  History,
  Mic,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  Volume2,
} from "lucide-react";
import {
  getVoiceProfile,
  JARVIS_VOICE_PROFILES,
  JarvisActionLog,
  JarvisConfig,
  JarvisMemory,
  JarvisUndoItem,
  SystemTelemetry,
} from "../types/jarvis";

interface DashboardAndMemoryViewProps {
  config: JarvisConfig;
  memories: JarvisMemory[];
  undoStack: JarvisUndoItem[];
  actionLogs: JarvisActionLog[];
  telemetry: SystemTelemetry;
  onUpdateConfig: (partial: Partial<JarvisConfig>) => Promise<void>;
  onAddMemory: (category: string, content: string) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  onUndo: (undoId?: string) => Promise<void>;
  onTestVoice: () => void;
  onOpenCalibration: () => void;
}

export const DashboardAndMemoryView: React.FC<DashboardAndMemoryViewProps> = ({
  config,
  memories,
  undoStack,
  actionLogs,
  telemetry,
  onUpdateConfig,
  onAddMemory,
  onDeleteMemory,
  onUndo,
  onTestVoice,
  onOpenCalibration,
}) => {
  const [newMemCat, setNewMemCat] = useState<string>("preference");
  const [newMemContent, setNewMemContent] = useState<string>("");
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>("default");

  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          setAudioInputs(devices.filter((d) => d.kind === "audioinput"));
          setAudioOutputs(devices.filter((d) => d.kind === "audiooutput"));
        })
        .catch(() => {});
    }
  }, []);

  const handleAddMemorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemContent.trim()) return;
    await onAddMemory(newMemCat, newMemContent.trim());
    setNewMemContent("");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Row: System Telemetry (actions/system_monitor.py + dashboard/server.py) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>CPU Compute Load</span>
            <Cpu className="w-4 h-4 text-sky-400" />
          </div>
          <div className="my-2 text-2xl font-bold font-mono tabular-nums text-white">
            {telemetry.cpuPercent}%
          </div>
          <div className="text-xs text-slate-400 truncate">
            {telemetry.cores} Cores · {telemetry.platform}
          </div>
        </div>

        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Memory Allocation</span>
            <Brain className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2 text-2xl font-bold font-mono tabular-nums text-white">
            {telemetry.memoryUsedGb} / {telemetry.memoryTotalGb} GB
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            Utilization: {telemetry.memoryPercent}% · Nominal
          </div>
        </div>

        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Long-Term Memory Vault</span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="my-2 text-2xl font-bold font-mono tabular-nums text-white">
            {memories.length} Facts
          </div>
          <div className="text-xs text-slate-400">
            memory/memory_manager.py · Persistent JSON
          </div>
        </div>

        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Reversible Undo Stack</span>
            <RotateCcw className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2 text-2xl font-bold font-mono tabular-nums text-white">
            {undoStack.length} States
          </div>
          <div className="text-xs text-slate-400">
            core/undo.py · Instant state rollback
          </div>
        </div>
      </div>

      {/* Main Grid: Memory Manager (Left) + Config & Audio Devices (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Long-Term Memory Vault (memory/memory_manager.py) */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="pb-3 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white">01. Long-Term Memory Manager</h2>
            <p className="text-xs text-slate-400">
              memory/memory_manager.py · Facts & user preferences injected into every Gemini prompt
            </p>
          </div>

          <form onSubmit={handleAddMemorySubmit} className="flex flex-col sm:flex-row gap-2">
            <select
              value={newMemCat}
              onChange={(e) => setNewMemCat(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              <option value="identity">Identity</option>
              <option value="preference">Preference</option>
              <option value="project">Project</option>
              <option value="note">Note</option>
            </select>
            <input
              type="text"
              value={newMemContent}
              onChange={(e) => setNewMemContent(e.target.value)}
              placeholder="Teach Jarvis a permanent fact (e.g. 'My favorite language is Python')..."
              className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Store Memory
            </button>
          </form>

          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
            {memories.map((mem) => (
              <div
                key={mem.id}
                className="flex items-start justify-between gap-3 p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-lg"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono uppercase text-sky-400">{mem.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Confidence: {Math.round((mem.confidence || 0.98) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{mem.content}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteMemory(mem.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                  title="Forget memory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Config Manager + Audio Devices (memory/config_manager.py + core/audio_devices.py) */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-white">
                02. Jarvis Configuration &amp; Audio Pipeline
              </h2>
              <p className="text-xs text-slate-400">
                Voice Persona · Language Mode · Audio Input Hardware
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenCalibration}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap"
              >
                <Settings className="w-3.5 h-3.5" />
                Auto-Calibrate Audio &amp; TTS
              </button>
              <button
                type="button"
                onClick={onTestVoice}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-950/60 border border-sky-500/30 rounded-lg hover:bg-sky-900/50 transition-colors whitespace-nowrap"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Test Voice
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Honorific Title (How Jarvis addresses you)
              </label>
              <input
                type="text"
                value={config.userTitle}
                onChange={(e) => onUpdateConfig({ userTitle: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Voice Persona (Male ♂ &amp; Female ♀ · Urdu &amp; English)
              </label>
              <select
                value={getVoiceProfile(config.voiceName).id}
                onChange={(e) =>
                  onUpdateConfig({
                    voiceName: e.target.value as JarvisConfig["voiceName"],
                  })
                }
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
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
              <div className="mt-1 text-[11px] text-sky-400 font-mono">
                Active: {getVoiceProfile(config.voiceName).label} (
                {getVoiceProfile(config.voiceName).gender === "male" ? "♂ MALE" : "♀ FEMALE"})
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Language Comprehension Mode
              </label>
              <select
                value={config.languageMode}
                onChange={(e) => onUpdateConfig({ languageMode: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              >
                <option value="Multilingual (English + Roman Urdu / Hinglish)">
                  Multilingual (English + Roman Urdu / Hinglish)
                </option>
                <option value="Roman Urdu / Urdu Primary">
                  Roman Urdu / Urdu Primary
                </option>
                <option value="English Only (Formal British Butler)">
                  English Only (Formal British Butler)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                HUD Optical Theme
              </label>
              <select
                value={config.hudAccent}
                onChange={(e) =>
                  onUpdateConfig({
                    hudAccent: e.target.value as JarvisConfig["hudAccent"],
                  })
                }
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              >
                <option value="cyan">Jarvis Electric Cyan (#38BDF8)</option>
                <option value="amber">Tactical Gold Amber (#F59E0B)</option>
                <option value="emerald">Matrix Emerald (#10B981)</option>
              </select>
            </div>
          </div>

          {/* Audio Input Selector (core/audio_devices.py) */}
          <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-lg flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-sky-400" />
                Audio Input Hardware (core/audio_devices.py · core/echo.py)
              </span>
              <span className="font-mono text-emerald-400">Echo Guard Active</span>
            </div>
            <select
              value={selectedMicId}
              onChange={(e) => setSelectedMicId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200"
            >
              <option value="default">System Default Microphone Array (16kHz PCM)</option>
              {audioInputs.map((mic, idx) => (
                <option key={mic.deviceId || idx} value={mic.deviceId}>
                  {mic.label || `Microphone Input #${idx + 1}`}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-slate-400">
              Detected {audioInputs.length || 1} input channel(s) · {audioOutputs.length || 1} output channel(s)
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => onUpdateConfig({ autoMicOpen: !(config.autoMicOpen ?? true) })}
              className={`p-3 rounded-lg border text-left transition-colors ${
                (config.autoMicOpen ?? true)
                  ? "bg-emerald-500/10 border-emerald-500/40 text-slate-100"
                  : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              <div className="text-xs font-semibold">Auto Mic Open 🎤</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {(config.autoMicOpen ?? true)
                  ? "Hands-Free Continuous Listening"
                  : "Manual Push-to-Talk"}
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateConfig({
                  autoReply: !(config.autoReply ?? true),
                  autoSpeak: !(config.autoReply ?? true),
                })
              }
              className={`p-3 rounded-lg border text-left transition-colors ${
                (config.autoReply ?? true) && config.autoSpeak
                  ? "bg-sky-500/10 border-sky-500/40 text-slate-100"
                  : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              <div className="text-xs font-semibold">Auto Voice Reply</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {(config.autoReply ?? true) && config.autoSpeak
                  ? "Auto-Speak + Re-open Mic After Reply"
                  : "Silent Text Reply"}
              </div>
            </button>

            <button
              type="button"
              onClick={() => onUpdateConfig({ confirmDestructive: !config.confirmDestructive })}
              className={`p-3 rounded-lg border text-left transition-colors ${
                config.confirmDestructive
                  ? "bg-emerald-500/10 border-emerald-500/40 text-slate-100"
                  : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              <div className="text-xs font-semibold">Safety Confirmation (core/confirm.py)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {config.confirmDestructive ? "Requires Auth on Delete" : "Bypassed"}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Undo Stack (core/undo.py) & Action Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-white">Undo Stack Manager (core/undo.py)</h3>
              <p className="text-xs text-slate-400">Roll back recent file edits, reminders, or settings</p>
            </div>
            {undoStack.length > 0 && (
              <button
                type="button"
                onClick={() => onUndo()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Undo Latest
              </button>
            )}
          </div>

          {undoStack.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No reversible operations in stack yet. Perform an action with JARVIS to populate undo states.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
              {undoStack.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-slate-200 font-medium truncate">{item.description}</div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUndo(item.id)}
                    className="px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/50 border border-amber-500/30 rounded hover:bg-amber-900/50 whitespace-nowrap"
                  >
                    Revert
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-sky-400" />
              Jarvis Execution Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Real-time execution log of Jarvis actions
            </p>
          </div>

          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto font-mono text-xs">
            {actionLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between gap-3 p-2.5 bg-slate-950/80 border border-slate-800/80 rounded"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="text-sky-400">{log.module}</span>
                    <span>·</span>
                    <span>{log.action}</span>
                  </div>
                  <div className="text-slate-200 font-sans text-xs">{log.summary}</div>
                </div>
                <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
