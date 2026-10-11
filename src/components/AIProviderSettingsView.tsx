import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Play,
  Save,
  Trash2,
} from "lucide-react";
import {
  AIProviderId,
  AIProviderManagerSettings,
} from "../types/jarvis";

interface AIProviderSettingsViewProps {
  settings: AIProviderManagerSettings;
  onSaveProvider: (payload: {
    providerId?: AIProviderId;
    enabled?: boolean;
    allowFallbackUse?: boolean;
    model?: string;
    customModel?: string;
    baseUrl?: string;
    apiKey?: string;
    defaultProvider?: AIProviderId;
    automaticFallback?: boolean;
    providerPriority?: AIProviderId[];
    requestTimeoutMs?: number;
    maxRetriesPerProvider?: number;
  }) => Promise<void>;
  onDeleteKey: (providerId: AIProviderId) => Promise<void>;
  onTestConnection: (payload: {
    providerId: AIProviderId;
    apiKey?: string;
    model: string;
    customModel?: string;
    baseUrl?: string;
  }) => Promise<{
    ok: boolean;
    latencyMs: number;
    modelTested: string;
    message: string;
  }>;
}

const OPENAI_MODELS = [
  { id: "gpt-4o-mini", label: "gpt-4o-mini — Fast & Recommended (Primary)" },
  { id: "gpt-4o", label: "gpt-4o — Flagship Smart Model" },
  { id: "gpt-4.1-mini", label: "gpt-4.1-mini — Latest Mini" },
  { id: "o3-mini", label: "o3-mini — Reasoning Model" },
];

export const AIProviderSettingsView: React.FC<AIProviderSettingsViewProps> = ({
  settings,
  onSaveProvider,
  onDeleteKey,
  onTestConnection,
}) => {
  const openAiConfig = settings.providers.openai;

  const [model, setModel] = useState<string>(openAiConfig?.model || "gpt-4o-mini");
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setModel(settings.providers.openai?.model || "gpt-4o-mini");
  }, [settings.providers.openai?.model]);

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await onSaveProvider({
        providerId: "openai",
        enabled: true,
        allowFallbackUse: true,
        model,
        apiKey: apiKeyInput.trim() ? apiKeyInput.trim() : undefined,
        defaultProvider: "openai",
        automaticFallback: false,
        providerPriority: ["openai"],
      });
      setApiKeyInput("");
      setShowKey(false);
      setFeedback({
        type: "success",
        message:
          "OpenAI Primary API Key aur Model save ho gaya hai! Ab Jarvis OpenAI se chalega.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to save OpenAI API Key",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      const res = await onTestConnection({
        providerId: "openai",
        apiKey: apiKeyInput.trim() ? apiKeyInput.trim() : undefined,
        model,
      });
      setFeedback({
        type: res.ok ? "success" : "error",
        message: res.message,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Connection test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setFeedback(null);
    try {
      await onDeleteKey("openai");
      setApiKeyInput("");
      setFeedback({
        type: "success",
        message: "Saved OpenAI API Key remove kar di gayi hai.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to delete API key",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">
                OpenAI API Key (Primary AI Engine)
              </h1>
              <p className="text-xs text-slate-400">
                اپنی اوپن اے آئی (OpenAI) کی پرائمری کلید یہاں درج کریں
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg border whitespace-nowrap ${
              openAiConfig?.apiKeyConfigured
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                : "bg-amber-500/15 text-amber-300 border-amber-500/40"
            }`}
          >
            {openAiConfig?.apiKeyConfigured ? "● Key Active" : "○ Key Needed"}
          </span>
        </div>

        {/* Saved Masked Key Display */}
        {openAiConfig?.apiKeyConfigured && (
          <div className="px-3.5 py-2.5 bg-slate-950 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400">Saved Primary Key:</span>
            <code className="font-mono text-emerald-300 font-semibold">
              {openAiConfig.maskedKey || "••••••••••••"}
            </code>
          </div>
        )}

        {/* OpenAI API Key Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-200">
            {openAiConfig?.apiKeyConfigured
              ? "Replace OpenAI API Key (نئی کلید لگائیں)"
              : "Enter OpenAI API Key (اپنی OpenAI API Key ڈالیں)"}
          </label>
          <div className="relative flex items-center">
            <input
              type={showKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-proj-..."
              autoComplete="off"
              className="w-full px-3.5 py-2.5 pr-10 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-sky-400"
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              className="absolute right-3 text-slate-400 hover:text-white"
              title={showKey ? "Hide API Key" : "Show API Key"}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* OpenAI Model Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-200">
            Primary OpenAI Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-sky-400"
          >
            {OPENAI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 leading-relaxed ${
              feedback.type === "success"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                : "bg-rose-950/60 border-rose-500/40 text-rose-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-50 rounded-xl transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Primary OpenAI Key
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 disabled:opacity-50 rounded-xl transition-colors"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Test Key
          </button>

          {openAiConfig?.apiKeyConfigured && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 disabled:opacity-50 rounded-xl transition-colors"
              title="Delete Saved Key"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
