export type AiProviderName = "mock" | "openai" | "anthropic" | "local";

export interface AiModelsConfig {
  readonly fast: string;
  readonly balanced: string;
  readonly creative: string;
}

export interface AiConfig {
  readonly provider: AiProviderName;
  readonly baseUrl: string;
  readonly apiKey: string | null;
  readonly models: AiModelsConfig;
}

export interface ApiConfig {
  readonly port: number;
  readonly authBaseUrl: string;
  readonly ai: AiConfig;
}

const defaultPort: number = 8787;
const defaultAiProvider: AiProviderName = "mock";
const defaultAiBaseUrl: string = "https://api.openai.com/v1";

function parsePort(rawPort: string | undefined): number {
  const parsed: number = rawPort === undefined ? Number.NaN : Number(rawPort);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return defaultPort;
}

function readEnv(key: string): string | undefined {
  const raw: string | undefined = process.env[key];
  if (raw === undefined) {
    return undefined;
  }
  const trimmed: string = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed;
}

function parseAiProvider(rawProvider: string | undefined): AiProviderName {
  if (rawProvider === "openai") {
    return "openai";
  }
  if (rawProvider === "anthropic") {
    return "anthropic";
  }
  if (rawProvider === "local") {
    return "local";
  }
  return defaultAiProvider;
}

function getAiConfig(): AiConfig {
  const providerEnv: string | undefined = readEnv("MIRO_AI_PROVIDER");
  const provider: AiProviderName = parseAiProvider(providerEnv);
  const baseUrlEnv: string | undefined = readEnv("MIRO_AI_BASE_URL");
  const baseUrl: string = baseUrlEnv ?? defaultAiBaseUrl;
  const apiKeyEnv: string | undefined = readEnv("MIRO_AI_API_KEY");
  const apiKey: string | null = apiKeyEnv ?? null;
  const models: AiModelsConfig = {
    fast: readEnv("MIRO_AI_MODEL_FAST") ?? "gpt-4o-mini",
    balanced: readEnv("MIRO_AI_MODEL_BALANCED") ?? "gpt-4o",
    creative: readEnv("MIRO_AI_MODEL_CREATIVE") ?? "gpt-4.1-mini",
  };
  const config: AiConfig = { provider, baseUrl, apiKey, models };
  return config;
}

function validateAiConfig(ai: AiConfig): void {
  if ((ai.provider === "openai" || ai.provider === "local") && ai.apiKey === null) {
    throw new Error("MIRO_AI_API_KEY is required when MIRO_AI_PROVIDER is 'openai' or 'local'.");
  }
}

export function getApiConfig(): ApiConfig {
  const port: number = parsePort(process.env.PORT);
  const authBaseRaw: string | undefined = process.env.AUTH_BASE_URL;
  const authBaseUrl: string = authBaseRaw && authBaseRaw.trim().length > 0 ? authBaseRaw : "http://localhost:8787";
  const ai: AiConfig = getAiConfig();
  validateAiConfig(ai);
  return { port, authBaseUrl, ai };
}
