import crypto from "crypto";
import fs from "fs";
import path from "path";
import { FunctionDeclaration, GoogleGenAI } from "@google/genai";
import {
  AIProviderConfig,
  AIProviderId,
  AIProviderManagerSettings,
  ProviderAttemptLog,
} from "../types/jarvis";

const VAULT_FILE = path.join(process.cwd(), ".jarvis-provider-secrets.enc");

// Derive a 256-bit machine-bound encryption key for the local server secret vault
function getVaultCipherKey(): Buffer {
  const secretSeed =
    process.env.JARVIS_VAULT_SECRET ||
    process.env.GEMINI_API_KEY ||
    "jarvis-mark-lv-aes-256-gcm-server-vault-key";
  return crypto.scryptSync(secretSeed, "jarvis-mark-lv-salt-v1", 32);
}

interface EncryptedSecretMap {
  [providerId: string]: string;
}

function loadDecryptedKeys(): EncryptedSecretMap {
  try {
    if (!fs.existsSync(VAULT_FILE)) return {};
    const raw = fs.readFileSync(VAULT_FILE, "utf-8");
    const payload = JSON.parse(raw);
    const iv = Buffer.from(payload.iv, "hex");
    const tag = Buffer.from(payload.tag, "hex");
    const encrypted = Buffer.from(payload.data, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getVaultCipherKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
      "utf-8"
    );
    return JSON.parse(decrypted);
  } catch {
    return {};
  }
}

function saveEncryptedKeys(keys: EncryptedSecretMap): void {
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getVaultCipherKey(), iv);
    const plaintext = JSON.stringify(keys);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = {
      version: 1,
      algorithm: "aes-256-gcm",
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
      data: encrypted.toString("hex"),
    };
    fs.writeFileSync(VAULT_FILE, JSON.stringify(payload, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
    });
  } catch {
    // Do not log secrets on write error
  }
}

let inMemoryKeyVault: EncryptedSecretMap = loadDecryptedKeys();

export function setProviderApiKey(providerId: AIProviderId, rawKey: string): void {
  const trimmed = rawKey.trim();
  if (!trimmed) return;
  inMemoryKeyVault[providerId] = trimmed;
  saveEncryptedKeys(inMemoryKeyVault);
}

export function deleteProviderApiKey(providerId: AIProviderId): void {
  delete inMemoryKeyVault[providerId];
  saveEncryptedKeys(inMemoryKeyVault);
}

export function getProviderApiKey(providerId: AIProviderId): string {
  const userKey = inMemoryKeyVault[providerId];
  if (userKey && userKey.trim()) return userKey.trim();
  if (providerId === "openai") {
    const envOpenAi = process.env.OPENAI_API_KEY || "";
    if (envOpenAi && envOpenAi.trim()) return envOpenAi.trim();
  }
  if (providerId === "gemini") {
    const envKey = process.env.GEMINI_API_KEY || "";
    if (envKey && envKey !== "MY_GEMINI_API_KEY") return envKey;
  }
  return "";
}

export function isUsingEnvironmentKey(providerId: AIProviderId): boolean {
  if (inMemoryKeyVault[providerId]) return false;
  if (providerId === "openai") {
    const envOpenAi = process.env.OPENAI_API_KEY || "";
    return Boolean(envOpenAi && envOpenAi.trim());
  }
  if (providerId === "gemini") {
    const envKey = process.env.GEMINI_API_KEY || "";
    return Boolean(envKey && envKey !== "MY_GEMINI_API_KEY");
  }
  return false;
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  const clean = key.trim();
  if (clean.length <= 8) return "••••••••••••";
  return `••••••••••••${clean.slice(-4)}`;
}

export function sanitizeErrorMessage(rawError: unknown, possibleKeys: string[] = []): string {
  let msg = rawError instanceof Error ? rawError.message : String(rawError || "Unknown error");
  for (const k of possibleKeys) {
    if (k && k.length > 4) {
      msg = msg.split(k).join("[REDACTED_API_KEY]");
    }
  }
  // Scrub any accidental key patterns (AIza..., sk-..., gsk_...)
  msg = msg.replace(/AIza[0-9A-Za-z\-_]{20,}/g, "[REDACTED_GEMINI_KEY]");
  msg = msg.replace(/sk-[0-9A-Za-z\-_]{16,}/g, "[REDACTED_OPENAI_KEY]");
  msg = msg.replace(/gsk_[0-9A-Za-z\-_]{16,}/g, "[REDACTED_GROQ_KEY]");
  return msg.slice(0, 320);
}

export function createDefaultProviderSettings(): AIProviderManagerSettings {
  const openAiKey = getProviderApiKey("openai");
  const geminiKey = getProviderApiKey("gemini");
  return {
    defaultProvider: "openai",
    automaticFallback: true,
    providerPriority: ["openai", "gemini"],
    requestTimeoutMs: 15000,
    maxRetriesPerProvider: 1,
    activeProvider: "openai",
    activeModel: "gpt-4o-mini",
    providers: {
      openai: {
        id: "openai",
        name: "OpenAI",
        enabled: true,
        allowFallbackUse: true,
        model: "gpt-4o-mini",
        customModel: "",
        baseUrl: "https://api.openai.com/v1",
        apiKeyConfigured: Boolean(openAiKey),
        maskedKey: openAiKey ? maskApiKey(openAiKey) : "",
        usingEnvironmentKey: isUsingEnvironmentKey("openai"),
        status: openAiKey ? "ready" : "untested",
      },
      gemini: {
        id: "gemini",
        name: "Google Gemini",
        enabled: true,
        allowFallbackUse: true,
        model: "gemini-3.8-flash",
        customModel: "",
        apiKeyConfigured: Boolean(geminiKey),
        maskedKey: geminiKey ? maskApiKey(geminiKey) : "",
        usingEnvironmentKey: isUsingEnvironmentKey("gemini"),
        status: geminiKey ? "ready" : "untested",
      },
      groq: {
        id: "groq",
        name: "Groq Cloud LPU",
        enabled: false,
        allowFallbackUse: false,
        model: "llama-3.3-70b-versatile",
        customModel: "",
        baseUrl: "https://api.groq.com/openai/v1",
        apiKeyConfigured: false,
        maskedKey: "",
        status: "disabled",
      },
      custom: {
        id: "custom",
        name: "Custom OpenAI-Compatible API",
        enabled: false,
        allowFallbackUse: false,
        model: "deepseek-chat",
        customModel: "",
        baseUrl: "https://api.openai.com/v1",
        apiKeyConfigured: false,
        maskedKey: "",
        status: "disabled",
      },
    },
  };
}

export function syncProviderSettingsWithVault(
  settings: AIProviderManagerSettings
): AIProviderManagerSettings {
  const defaults = createDefaultProviderSettings();
  const openAiKey = getProviderApiKey("openai");
  const geminiKey = getProviderApiKey("gemini");
  const openAiModel = settings?.providers?.openai?.model || "gpt-4o-mini";
  const merged: AIProviderManagerSettings = {
    ...defaults,
    ...settings,
    defaultProvider: "openai",
    automaticFallback: true,
    providerPriority: ["openai", "gemini"],
    activeProvider: "openai",
    activeModel: openAiModel,
    providers: {
      ...defaults.providers,
      openai: {
        ...defaults.providers.openai,
        ...(settings?.providers?.openai || {}),
        id: "openai",
        name: "OpenAI",
        enabled: true,
        allowFallbackUse: true,
        model: openAiModel,
        apiKeyConfigured: Boolean(openAiKey),
        maskedKey: openAiKey ? maskApiKey(openAiKey) : "",
        usingEnvironmentKey: isUsingEnvironmentKey("openai"),
        status: openAiKey ? "ready" : "untested",
      },
      gemini: {
        ...defaults.providers.gemini,
        enabled: true,
        allowFallbackUse: true,
        apiKeyConfigured: Boolean(geminiKey),
        maskedKey: geminiKey ? maskApiKey(geminiKey) : "",
        usingEnvironmentKey: isUsingEnvironmentKey("gemini"),
        status: geminiKey ? "ready" : "untested",
      },
      groq: { ...defaults.providers.groq, enabled: false, status: "disabled" },
      custom: { ...defaults.providers.custom, enabled: false, status: "disabled" },
    },
  };

  return merged;
}

export function getEffectiveModel(provider: AIProviderConfig): string {
  if (provider.customModel && provider.customModel.trim()) {
    return provider.customModel.trim();
  }
  return provider.model;
}

function classifyProviderError(err: any, statusCode?: number): {
  category: "auth" | "quota_or_rate_limit" | "timeout" | "network_or_server" | "invalid_request";
  retryableSameProvider: boolean;
  retryAfterMs?: number;
} {
  const msg = String(err?.message || err || "").toLowerCase();
  const code = statusCode || err?.status || err?.code;

  if (
    code === 401 ||
    code === 403 ||
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("api_key_invalid") ||
    msg.includes("invalid api key") ||
    msg.includes("incorrect api key") ||
    msg.includes("unauthorized")
  ) {
    return { category: "auth", retryableSameProvider: false };
  }

  if (
    code === 429 ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("quota")
  ) {
    return {
      category: "quota_or_rate_limit",
      retryableSameProvider: false,
      retryAfterMs: err?.retryAfterMs,
    };
  }

  if (msg.includes("abort") || msg.includes("timed out") || msg.includes("timeout")) {
    return { category: "timeout", retryableSameProvider: true };
  }

  if (code === 400 || code === 404 || msg.includes("model_not_found")) {
    return { category: "invalid_request", retryableSameProvider: false };
  }

  return { category: "network_or_server", retryableSameProvider: true };
}

function normalizeChatCompletionsUrl(baseUrl?: string, defaultBase?: string): string {
  const raw = (baseUrl && baseUrl.trim()) || defaultBase || "https://api.openai.com/v1";
  const stripped = raw.replace(/\/+$/, "");
  if (stripped.endsWith("/chat/completions")) return stripped;
  return `${stripped}/chat/completions`;
}

// Convert Gemini FunctionDeclaration[] to OpenAI tools schema
function toOpenAITools(declarations: FunctionDeclaration[]) {
  return declarations.map((fn) => ({
    type: "function",
    function: {
      name: fn.name,
      description: fn.description || "",
      parameters: {
        type: "object",
        properties: Object.fromEntries(
          Object.entries((fn.parameters as any)?.properties || {}).map(([k, v]: [string, any]) => [
            k,
            {
              type: String(v.type || "STRING").toLowerCase(),
              description: v.description || "",
            },
          ])
        ),
        required: (fn.parameters as any)?.required || [],
      },
    },
  }));
}

export interface AdapterChatInput {
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemPrompt: string;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  functionDeclarations: FunctionDeclaration[];
  useWebSearch?: boolean;
  timeoutMs: number;
}

export interface AdapterChatOutput {
  text: string;
  functionCalls: Array<{ name: string; args: any }>;
  citations: Array<{ title: string; uri: string }>;
}

// 1. Google Gemini Adapter (https://ai.google.dev/gemini-api/docs)
export async function runGeminiAdapter(input: AdapterChatInput): Promise<AdapterChatOutput> {
  const ai = new GoogleGenAI({
    apiKey: input.apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const contents = input.history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  const tools: any[] = [];
  if (input.functionDeclarations.length > 0) {
    tools.push({ functionDeclarations: input.functionDeclarations });
  }
  if (input.useWebSearch) {
    tools.unshift({ googleSearch: {} });
  }

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Gemini request timed out after ${input.timeoutMs}ms`)), input.timeoutMs)
  );

  const response: any = await Promise.race([
    ai.models.generateContent({
      model: input.model || "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction: input.systemPrompt,
        ...(tools.length > 0 ? { tools } : {}),
        ...(input.useWebSearch ? { toolConfig: { includeServerSideToolInvocations: true } } : {}),
      },
    }),
    timeoutPromise,
  ]);

  const functionCalls = (response.functionCalls || []).map((fc: any) => ({
    name: fc.name,
    args: fc.args || {},
  }));

  const groundingChunks: any[] =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const citations = groundingChunks
    .map((c: any) => c.web)
    .filter(Boolean)
    .map((w: any) => ({ title: w?.title || w?.uri || "Source", uri: w?.uri || "#" }));

  return {
    text: response.text || "",
    functionCalls,
    citations,
  };
}

// Shared helper for OpenAI, Groq, and Custom OpenAI-Compatible APIs
async function runOpenAICompatibleRequest(
  endpointUrl: string,
  input: AdapterChatInput,
  includeTools: boolean
): Promise<AdapterChatOutput> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const messages = [
      { role: "system", content: input.systemPrompt },
      ...input.history.map((m) => ({
        role: m.role,
        content: m.text,
      })),
    ];

    const bodyPayload: any = {
      model: input.model,
      messages,
      temperature: 0.7,
    };

    if (includeTools && input.functionDeclarations.length > 0) {
      bodyPayload.tools = toOpenAITools(input.functionDeclarations);
      bodyPayload.tool_choice = "auto";
    }

    const res = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined;
      let errText = "";
      try {
        const errJson: any = await res.json();
        errText = errJson?.error?.message || JSON.stringify(errJson);
      } catch {
        errText = await res.text();
      }
      const errorObj: any = new Error(`HTTP ${res.status}: ${errText}`);
      errorObj.status = res.status;
      errorObj.retryAfterMs = retryAfterMs;
      throw errorObj;
    }

    const data: any = await res.json();
    const choice = data?.choices?.[0]?.message || {};
    const text = typeof choice.content === "string" ? choice.content : "";
    const rawToolCalls: any[] = choice.tool_calls || [];

    const functionCalls = rawToolCalls
      .map((tc: any) => {
        try {
          const parsedArgs =
            typeof tc?.function?.arguments === "string"
              ? JSON.parse(tc.function.arguments)
              : tc?.function?.arguments || {};
          return {
            name: tc?.function?.name,
            args: parsedArgs,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{ name: string; args: any }>;

    return {
      text,
      functionCalls,
      citations: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

// 2. OpenAI Adapter (https://platform.openai.com/docs/api-reference)
export async function runOpenAIAdapter(input: AdapterChatInput): Promise<AdapterChatOutput> {
  const url = normalizeChatCompletionsUrl(input.baseUrl, "https://api.openai.com/v1");
  return runOpenAICompatibleRequest(url, input, true);
}

// 3. Groq Adapter (https://console.groq.com/docs)
export async function runGroqAdapter(input: AdapterChatInput): Promise<AdapterChatOutput> {
  const url = normalizeChatCompletionsUrl(input.baseUrl, "https://api.groq.com/openai/v1");
  try {
    return await runOpenAICompatibleRequest(url, input, true);
  } catch (err: any) {
    // If a specific Groq model rejects tool schemas, retry cleanly without tools
    if (String(err?.message || "").includes("tool") && input.functionDeclarations.length > 0) {
      return await runOpenAICompatibleRequest(url, input, false);
    }
    throw err;
  }
}

// 4. Custom OpenAI-Compatible Adapter (does not assume every provider supports OpenAI tool schemas)
export async function runCustomOpenAICompatibleAdapter(
  input: AdapterChatInput
): Promise<AdapterChatOutput> {
  const url = normalizeChatCompletionsUrl(input.baseUrl, "https://api.openai.com/v1");
  return runOpenAICompatibleRequest(url, input, false);
}

// Test Connection for a single provider (Section 6)
export async function testProviderConnection(params: {
  providerId: AIProviderId;
  candidateApiKey?: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
}): Promise<{
  ok: boolean;
  latencyMs: number;
  modelTested: string;
  message: string;
}> {
  const start = Date.now();
  const apiKey =
    params.candidateApiKey && params.candidateApiKey.trim()
      ? params.candidateApiKey.trim()
      : getProviderApiKey(params.providerId);

  if (!apiKey) {
    return {
      ok: false,
      latencyMs: 0,
      modelTested: params.model,
      message: "API key is empty. Please enter a valid API key before testing.",
    };
  }

  if (!params.model || !params.model.trim()) {
    return {
      ok: false,
      latencyMs: 0,
      modelTested: "",
      message: "Model name is required.",
    };
  }

  if (params.providerId === "custom" && (!params.baseUrl || !params.baseUrl.trim())) {
    return {
      ok: false,
      latencyMs: 0,
      modelTested: params.model,
      message: "API Base URL is required for Custom OpenAI-Compatible API.",
    };
  }

  const testInput: AdapterChatInput = {
    apiKey,
    model: params.model.trim(),
    baseUrl: params.baseUrl,
    systemPrompt: "You are JARVIS diagnostic probe. Reply with 'OK'.",
    history: [{ role: "user", text: "Ping connection test. Reply with OK." }],
    functionDeclarations: [],
    timeoutMs: params.timeoutMs || 12000,
  };

  try {
    let out: AdapterChatOutput;
    if (params.providerId === "gemini") {
      out = await runGeminiAdapter(testInput);
    } else if (params.providerId === "openai") {
      out = await runOpenAIAdapter(testInput);
    } else if (params.providerId === "groq") {
      out = await runGroqAdapter(testInput);
    } else {
      out = await runCustomOpenAICompatibleAdapter(testInput);
    }

    const latencyMs = Date.now() - start;
    return {
      ok: true,
      latencyMs,
      modelTested: params.model.trim(),
      message: `Connection verified (${latencyMs}ms). Response: "${(out.text || "OK")
        .trim()
        .slice(0, 60)}"`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const cleanErr = sanitizeErrorMessage(err, [apiKey]);
    return {
      ok: false,
      latencyMs,
      modelTested: params.model.trim(),
      message: `Connection test failed: ${cleanErr}`,
    };
  }
}

// Execute chat across configured providers with Priority Ordering & Automatic Fallback (Section 3)
export async function executeMultiProviderChat(params: {
  settings: AIProviderManagerSettings;
  systemPrompt: string;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  functionDeclarations: FunctionDeclaration[];
  useWebSearch?: boolean;
}): Promise<{
  success: boolean;
  providerUsed?: AIProviderId;
  modelUsed?: string;
  output?: AdapterChatOutput;
  fallbackNotice?: string;
  providerAttempts: ProviderAttemptLog[];
  errorSummary?: string;
}> {
  const { settings, systemPrompt, history, functionDeclarations, useWebSearch } = params;
  const timeoutMs = Math.max(4000, Math.min(45000, settings.requestTimeoutMs || 15000));
  const maxRetries = Math.max(0, Math.min(2, settings.maxRetriesPerProvider ?? 1));

  // Build ordered candidate list: defaultProvider first, then providerPriority if automaticFallback is enabled
  const orderedIds: AIProviderId[] = [settings.defaultProvider];
  if (settings.automaticFallback) {
    for (const id of settings.providerPriority) {
      if (!orderedIds.includes(id)) orderedIds.push(id);
    }
  }

  const attempts: ProviderAttemptLog[] = [];
  let primaryFailedProviderName: string | null = null;
  let primaryFailureReason: string | null = null;

  for (let idx = 0; idx < orderedIds.length; idx++) {
    const providerId = orderedIds[idx];
    const isPrimary = idx === 0;
    const providerCfg = settings.providers[providerId];
    const effectiveModel = getEffectiveModel(providerCfg);
    const apiKey = getProviderApiKey(providerId);

    if (!providerCfg.enabled) {
      attempts.push({
        providerId,
        model: effectiveModel,
        status: "skipped",
        reason: "Provider is disabled",
      });
      continue;
    }

    // Never automatically retry a failed request with a fallback/paid provider unless the user explicitly allowed it
    if (!isPrimary && !providerCfg.allowFallbackUse) {
      attempts.push({
        providerId,
        model: effectiveModel,
        status: "skipped",
        reason: "Not authorized for automatic fallback use",
      });
      continue;
    }

    if (!apiKey) {
      attempts.push({
        providerId,
        model: effectiveModel,
        status: "skipped",
        reason: "No API key configured",
      });
      if (isPrimary) {
        primaryFailedProviderName = providerCfg.name;
        primaryFailureReason = "API key not configured";
      }
      continue;
    }

    // Attempt request on this provider (with bounded retry for transient network/timeout errors)
    let attemptCount = 0;
    while (attemptCount <= maxRetries) {
      attemptCount++;
      const startTime = Date.now();
      try {
        const adapterInput: AdapterChatInput = {
          apiKey,
          model: effectiveModel,
          baseUrl: providerCfg.baseUrl,
          systemPrompt,
          history,
          functionDeclarations,
          useWebSearch,
          timeoutMs,
        };

        let output: AdapterChatOutput;
        if (providerId === "gemini") {
          output = await runGeminiAdapter(adapterInput);
        } else if (providerId === "openai") {
          output = await runOpenAIAdapter(adapterInput);
        } else if (providerId === "groq") {
          output = await runGroqAdapter(adapterInput);
        } else {
          output = await runCustomOpenAICompatibleAdapter(adapterInput);
        }

        const latencyMs = Date.now() - startTime;
        providerCfg.status = "connected";
        providerCfg.lastLatencyMs = latencyMs;
        providerCfg.lastError = undefined;
        settings.activeProvider = providerId;
        settings.activeModel = effectiveModel;

        attempts.push({
          providerId,
          model: effectiveModel,
          status: "success",
          latencyMs,
        });

        const fallbackNotice =
          !isPrimary && primaryFailedProviderName
            ? `Switched from ${primaryFailedProviderName} (${primaryFailureReason}) to fallback provider ${providerCfg.name} (${effectiveModel}).`
            : undefined;

        return {
          success: true,
          providerUsed: providerId,
          modelUsed: effectiveModel,
          output,
          fallbackNotice,
          providerAttempts: attempts,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        const cleanReason = sanitizeErrorMessage(err, [apiKey]);
        const classification = classifyProviderError(err);

        providerCfg.lastError = cleanReason;
        providerCfg.status =
          classification.category === "quota_or_rate_limit" ? "rate_limited" : "error";

        if (isPrimary && !primaryFailedProviderName) {
          primaryFailedProviderName = providerCfg.name;
          primaryFailureReason = classification.category.replace(/_/g, " ");
        }

        // Respect Retry-After if short and retryable
        if (
          classification.retryableSameProvider &&
          attemptCount <= maxRetries
        ) {
          const waitMs = Math.min(2000, classification.retryAfterMs || 600);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }

        attempts.push({
          providerId,
          model: effectiveModel,
          status: "failed",
          reason: cleanReason,
          latencyMs,
        });
        break;
      }
    }
  }

  const failedList = attempts
    .filter((a) => a.status === "failed")
    .map((a) => `${a.providerId.toUpperCase()} (${a.model}): ${a.reason}`)
    .join(" | ");

  const skippedList = attempts
    .filter((a) => a.status === "skipped")
    .map((a) => `${a.providerId.toUpperCase()}: ${a.reason}`)
    .join(" | ");

  return {
    success: false,
    providerAttempts: attempts,
    errorSummary:
      failedList ||
      skippedList ||
      "No AI providers are enabled and configured with a valid API key.",
  };
}
