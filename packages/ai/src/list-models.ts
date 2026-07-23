import { normalizeProviderId } from "./providers";
import { listComfyCheckpoints, DEFAULT_COMFYUI_BASE_URL } from "./comfyui";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434/v1";
const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";

export interface DiscoveredModel {
  readonly id: string;
  readonly label: string;
  readonly kind: "text" | "image";
  readonly tags: readonly string[];
}

export interface ListModelsConfig {
  readonly provider: string;
  readonly apiKey: string;
  readonly baseUrl?: string;
}

function isImageModelId(id: string): boolean {
  const lower = id.toLowerCase();
  return (
    lower.includes("dall-e") ||
    lower.includes("gpt-image") ||
    lower.includes("imagen") ||
    lower.includes("stable-diffusion") ||
    lower.includes("flux") ||
    lower.includes("sdxl")
  );
}

function isExcludedModelId(id: string): boolean {
  const lower = id.toLowerCase();
  return (
    lower.includes("embed") ||
    lower.includes("whisper") ||
    lower.includes("tts") ||
    lower.includes("moderation") ||
    lower.includes("realtime") ||
    lower.includes("transcribe") ||
    lower.includes("audio") ||
    lower.includes("instruct") && lower.includes("embedding")
  );
}

function toDiscoveredModel(id: string, label?: string): DiscoveredModel {
  const kind: "text" | "image" = isImageModelId(id) ? "image" : "text";
  const tags: string[] = [kind];
  if (kind === "image") {
    tags.push("quality");
  } else if (id.toLowerCase().includes("mini") || id.toLowerCase().includes("flash") || id.toLowerCase().includes("haiku")) {
    tags.push("fast");
  } else {
    tags.push("quality");
  }
  return { id, label: label ?? id, kind, tags };
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Model list request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function listOpenAiCompatibleModels(
  apiKey: string,
  baseUrl: string,
): Promise<DiscoveredModel[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/models`;
  const payload = await readJsonResponse<{ readonly data?: readonly { readonly id?: string }[] }>(
    await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }),
  );
  const models: DiscoveredModel[] = [];
  for (const entry of payload.data ?? []) {
    const id = entry.id?.trim();
    if (!id || isExcludedModelId(id)) {
      continue;
    }
    models.push(toDiscoveredModel(id));
  }
  return models.sort((a, b) => a.id.localeCompare(b.id));
}

async function listOllamaModels(baseUrl: string): Promise<DiscoveredModel[]> {
  const root = baseUrl.replace(/\/v1\/?$/, "").replace(/\/$/, "");
  try {
    const payload = await readJsonResponse<{
      readonly models?: readonly { readonly name?: string }[];
    }>(await fetch(`${root}/api/tags`));
    const models: DiscoveredModel[] = [];
    for (const entry of payload.models ?? []) {
      const name = entry.name?.trim();
      if (!name) {
        continue;
      }
      models.push({
        id: name,
        label: name,
        kind: "text",
        tags: ["text", "local"],
      });
    }
    if (models.length > 0) {
      return models.sort((a, b) => a.id.localeCompare(b.id));
    }
  } catch {
    // Fall through to OpenAI-compatible listing.
  }
  return listOpenAiCompatibleModels("ollama", baseUrl);
}

async function listGoogleModels(apiKey: string, baseUrl?: string): Promise<DiscoveredModel[]> {
  const root =
    baseUrl?.replace(/\/$/, "") ?? "https://generativelanguage.googleapis.com/v1beta";
  const url = `${root}/models?key=${encodeURIComponent(apiKey)}`;
  const payload = await readJsonResponse<{
    readonly models?: readonly {
      readonly name?: string;
      readonly displayName?: string;
      readonly supportedGenerationMethods?: readonly string[];
    }[];
  }>(await fetch(url));
  const models: DiscoveredModel[] = [];
  for (const entry of payload.models ?? []) {
    const rawName = entry.name?.trim() ?? "";
    const id = rawName.startsWith("models/") ? rawName.slice("models/".length) : rawName;
    if (!id) {
      continue;
    }
    const methods = entry.supportedGenerationMethods ?? [];
    const isImage = id.toLowerCase().includes("imagen");
    const supportsText =
      isImage || methods.includes("generateContent") || methods.includes("countTokens");
    if (!supportsText && !isImage) {
      continue;
    }
    const discovered = toDiscoveredModel(id, entry.displayName?.trim() || id);
    models.push(isImage ? { ...discovered, kind: "image", tags: ["image", "quality"] } : discovered);
  }
  return models.sort((a, b) => a.id.localeCompare(b.id));
}

async function listAnthropicModels(apiKey: string, baseUrl: string): Promise<DiscoveredModel[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/models`;
  const payload = await readJsonResponse<{
    readonly data?: readonly { readonly id?: string; readonly display_name?: string }[];
  }>(
    await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    }),
  );
  const models: DiscoveredModel[] = [];
  for (const entry of payload.data ?? []) {
    const id = entry.id?.trim();
    if (!id) {
      continue;
    }
    models.push(toDiscoveredModel(id, entry.display_name?.trim() || id));
  }
  return models.sort((a, b) => a.id.localeCompare(b.id));
}

export async function listModels(config: ListModelsConfig): Promise<DiscoveredModel[]> {
  const provider = normalizeProviderId(config.provider);
  const apiKey = config.apiKey.trim();

  if (provider === "mock") {
    return [{ id: "mock", label: "Mock", kind: "text", tags: ["text"] }];
  }

  if (provider === "local") {
    const baseUrl = config.baseUrl?.trim() || DEFAULT_OLLAMA_BASE_URL;
    return listOllamaModels(baseUrl);
  }

  if (provider === "comfyui") {
    const baseUrl = config.baseUrl?.trim() || DEFAULT_COMFYUI_BASE_URL;
    const checkpoints = await listComfyCheckpoints(baseUrl);
    return checkpoints.map((id) => ({
      id,
      label: id,
      kind: "image" as const,
      tags: ["image", "local", "quality"] as const,
    }));
  }

  if (provider === "google") {
    if (!apiKey) {
      throw new Error("API key is required to list Google models");
    }
    return listGoogleModels(apiKey, config.baseUrl);
  }

  if (provider === "anthropic") {
    if (!apiKey) {
      throw new Error("API key is required to list Anthropic models");
    }
    const baseUrl = config.baseUrl?.trim() || DEFAULT_ANTHROPIC_BASE_URL;
    return listAnthropicModels(apiKey, baseUrl);
  }

  if (provider === "openai" || provider === "openai-compatible") {
    if (!apiKey && provider !== "local") {
      throw new Error("API key is required to list OpenAI-compatible models");
    }
    const baseUrl = config.baseUrl?.trim() || DEFAULT_OPENAI_BASE_URL;
    return listOpenAiCompatibleModels(apiKey || "ollama", baseUrl);
  }

  throw new Error(`Model discovery is not supported for provider: ${config.provider}`);
}
