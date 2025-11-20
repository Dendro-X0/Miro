export type AiProviderName = "mock" | "openai" | "anthropic" | "google" | "local";

export interface AiModelsConfig {
  readonly fast: string;
  readonly balanced: string;
  readonly creative: string;
}

export type AiModelKind = "text" | "image";

export interface AiRuntimeModel {
  readonly id: string;
  readonly alias?: string;
  readonly kind: AiModelKind;
  readonly label: string;
  readonly tags: readonly string[];
}

export interface AiRuntimeProvider {
  readonly id: AiProviderName;
  readonly label: string;
  readonly baseUrl: string;
  readonly models: readonly AiRuntimeModel[];
  readonly ready: boolean;
  readonly supportsByok: boolean;
}

export interface AiRuntimeConfig {
  readonly defaultProviderId: AiProviderName;
  readonly providers: readonly AiRuntimeProvider[];
}

export interface AiConfig {
  readonly provider: AiProviderName;
  readonly baseUrl: string;
  readonly apiKey: string | null;
  readonly models: AiModelsConfig;
  readonly runtime: AiRuntimeConfig;
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
  if (rawProvider === "google") {
    return "google";
  }
  if (rawProvider === "local") {
    return "local";
  }
  return defaultAiProvider;
}

function buildRuntimeConfig(
  provider: AiProviderName,
  baseUrl: string,
  apiKey: string | null,
  models: AiModelsConfig,
): AiRuntimeConfig {
  const providers: AiRuntimeProvider[] = [];

  const mockProvider: AiRuntimeProvider = {
    id: "mock",
    label: "Mock",
    baseUrl: "",
    models: [],
    ready: true,
    supportsByok: false,
  };
  providers.push(mockProvider);

  const openaiBaseUrl: string = readEnv("MIRO_AI_OPENAI_BASE_URL") ?? (provider === "openai" ? baseUrl : defaultAiBaseUrl);
  const openaiApiKey: string | null =
    readEnv("MIRO_AI_OPENAI_API_KEY") ?? (provider === "openai" ? apiKey : null);
  const openaiFast: string =
    readEnv("MIRO_AI_OPENAI_MODEL_FAST") ?? (provider === "openai" ? models.fast : "gpt-4o-mini");
  const openaiBalanced: string =
    readEnv("MIRO_AI_OPENAI_MODEL_BALANCED") ?? (provider === "openai" ? models.balanced : "gpt-4o");
  const openaiCreative: string =
    readEnv("MIRO_AI_OPENAI_MODEL_CREATIVE") ?? (provider === "openai" ? models.creative : "gpt-4.1-mini");
  const openaiImage: string =
    readEnv("MIRO_AI_OPENAI_IMAGE_MODEL") ?? readEnv("MIRO_AI_IMAGE_MODEL") ?? "gpt-image-1";
  const openaiModels: AiRuntimeModel[] = [
    {
      id: openaiBalanced,
      alias: "balanced",
      kind: "text",
      label: "Balanced",
      tags: ["text", "quality"],
    },
    {
      id: openaiFast,
      alias: "fast",
      kind: "text",
      label: "Fast",
      tags: ["text", "fast"],
    },
    {
      id: openaiCreative,
      alias: "creative",
      kind: "text",
      label: "Creative",
      tags: ["text", "quality"],
    },
    {
      id: openaiImage,
      alias: "image-default",
      kind: "image",
      label: "Image",
      tags: ["image", "quality"],
    },
  ];
  const openaiProvider: AiRuntimeProvider = {
    id: "openai",
    label: "OpenAI",
    baseUrl: openaiBaseUrl,
    models: openaiModels,
    ready: openaiApiKey !== null,
    supportsByok: true,
  };
  providers.push(openaiProvider);

  const anthropicBaseUrl: string =
    readEnv("MIRO_AI_ANTHROPIC_BASE_URL") ?? "https://api.anthropic.com/v1";
  const anthropicApiKey: string | null = readEnv("MIRO_AI_ANTHROPIC_API_KEY") ?? null;
  const anthropicBalanced: string =
    readEnv("MIRO_AI_ANTHROPIC_MODEL_BALANCED") ?? "claude-3.7-sonnet";
  const anthropicFast: string =
    readEnv("MIRO_AI_ANTHROPIC_MODEL_FAST") ?? "claude-3.7-haiku";
  const anthropicModels: AiRuntimeModel[] = [
    {
      id: anthropicBalanced,
      alias: "balanced",
      kind: "text",
      label: "Claude Sonnet",
      tags: ["text", "quality"],
    },
    {
      id: anthropicFast,
      alias: "fast",
      kind: "text",
      label: "Claude Haiku",
      tags: ["text", "fast"],
    },
  ];
  const anthropicProvider: AiRuntimeProvider = {
    id: "anthropic",
    label: "Anthropic",
    baseUrl: anthropicBaseUrl,
    models: anthropicModels,
    ready: anthropicApiKey !== null,
    supportsByok: true,
  };
  providers.push(anthropicProvider);

  const googleBaseUrl: string =
    readEnv("MIRO_AI_GOOGLE_BASE_URL") ?? "https://generativelanguage.googleapis.com/v1beta";
  const googleApiKey: string | null = readEnv("MIRO_AI_GOOGLE_API_KEY") ?? null;
  const googleFast: string =
    readEnv("MIRO_AI_GOOGLE_MODEL_TEXT_FAST") ?? "gemini-2.0-flash";
  const googleBalanced: string =
    readEnv("MIRO_AI_GOOGLE_MODEL_TEXT_BALANCED") ?? "gemini-2.0-pro";
  const googleImage: string =
    readEnv("MIRO_AI_GOOGLE_MODEL_IMAGE") ?? "imagen-4";
  const googleModels: AiRuntimeModel[] = [
    {
      id: googleFast,
      alias: "fast",
      kind: "text",
      label: "Gemini Flash",
      tags: ["text", "fast"],
    },
    {
      id: googleBalanced,
      alias: "balanced",
      kind: "text",
      label: "Gemini Pro",
      tags: ["text", "quality"],
    },
    {
      id: googleImage,
      alias: "image-default",
      kind: "image",
      label: "Imagen",
      tags: ["image", "quality"],
    },
  ];
  const googleProvider: AiRuntimeProvider = {
    id: "google",
    label: "Google",
    baseUrl: googleBaseUrl,
    models: googleModels,
    ready: googleApiKey !== null,
    supportsByok: true,
  };
  providers.push(googleProvider);

  const localBaseUrl: string = readEnv("MIRO_AI_LOCAL_BASE_URL") ?? "http://localhost:8000/v1";
  const localTextModel: string = readEnv("MIRO_AI_LOCAL_MODEL_TEXT") ?? "local-llama-3";
  const localImageModel: string = readEnv("MIRO_AI_LOCAL_MODEL_IMAGE") ?? "local-sdxl";
  const localModels: AiRuntimeModel[] = [
    {
      id: localTextModel,
      kind: "text",
      label: "Local text model",
      tags: ["text", "local"],
    },
    {
      id: localImageModel,
      kind: "image",
      label: "Local image model",
      tags: ["image", "local"],
    },
  ];
  const localProvider: AiRuntimeProvider = {
    id: "local",
    label: "Local",
    baseUrl: localBaseUrl,
    models: localModels,
    ready: true,
    supportsByok: true,
  };
  providers.push(localProvider);

  const runtime: AiRuntimeConfig = {
    defaultProviderId: provider,
    providers,
  };
  return runtime;
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
  const runtime: AiRuntimeConfig = buildRuntimeConfig(provider, baseUrl, apiKey, models);
  const config: AiConfig = { provider, baseUrl, apiKey, models, runtime };
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
