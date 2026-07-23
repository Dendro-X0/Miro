import { normalizeProviderId, type AiProviderId } from "./providers";
import { createComfyUiImageClient } from "./comfyui";

export interface AiImageParams {
  readonly model: string;
  readonly prompt: string;
  readonly size?: string;
  readonly count?: number;
}

export interface AiImageResult {
  readonly url: string;
}

export interface AiImageClient {
  readonly generateImages: (params: AiImageParams) => Promise<readonly AiImageResult[]>;
}

export interface ImageClientConfig {
  readonly provider: string;
  readonly apiKey: string;
  readonly baseUrl?: string;
}

export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

function resolveOpenAiBaseUrl(config: ImageClientConfig, provider: AiProviderId): string {
  const trimmed = config.baseUrl?.trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, "");
  }
  if (provider === "local") {
    return "http://localhost:11434/v1";
  }
  return DEFAULT_OPENAI_BASE_URL;
}

function toDataUrl(b64: string, mime = "image/png"): string {
  const cleaned = b64.replace(/^data:[^;]+;base64,/, "");
  return `data:${mime};base64,${cleaned}`;
}

async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) {
    return url;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download generated image (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "image/png";
  const mime = contentType.split(";")[0]?.trim() || "image/png";
  return toDataUrl(buffer.toString("base64"), mime);
}

interface OpenAiImageResponse {
  readonly data?: readonly {
    readonly url?: string;
    readonly b64_json?: string;
  }[];
  readonly error?: { readonly message?: string };
}

async function postOpenAiImages(
  baseUrl: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<OpenAiImageResponse> {
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as OpenAiImageResponse;
  if (!response.ok) {
    const message = json.error?.message ?? `Image API error (${response.status})`;
    throw new Error(message);
  }
  return json;
}

async function normalizeOpenAiResults(
  payload: OpenAiImageResponse,
): Promise<readonly AiImageResult[]> {
  const rows = payload.data ?? [];
  if (rows.length === 0) {
    throw new Error("Image API returned no images");
  }
  const results: AiImageResult[] = [];
  for (const row of rows) {
    if (row.b64_json) {
      results.push({ url: toDataUrl(row.b64_json) });
      continue;
    }
    if (row.url) {
      try {
        results.push({ url: await urlToDataUrl(row.url) });
      } catch {
        results.push({ url: row.url });
      }
      continue;
    }
  }
  if (results.length === 0) {
    throw new Error("Image API returned empty image payloads");
  }
  return results;
}

export function createMockAiImageClient(): AiImageClient {
  async function generateImages(params: AiImageParams): Promise<readonly AiImageResult[]> {
    const label = encodeURIComponent(params.prompt.slice(0, 40) || "AI Image");
    return [{ url: `https://placehold.co/1024x1024?text=${label}` }];
  }
  return { generateImages };
}

export function createOpenAiCompatibleImageClient(config: ImageClientConfig): AiImageClient {
  const provider = normalizeProviderId(config.provider);
  const baseUrl = resolveOpenAiBaseUrl(config, provider);
  const apiKey = config.apiKey.trim();

  if (provider !== "local" && apiKey.length === 0) {
    throw new Error("API key is required for OpenAI-compatible image generation");
  }

  async function generateImages(params: AiImageParams): Promise<readonly AiImageResult[]> {
    const prompt = params.prompt.trim();
    if (!prompt) {
      throw new Error("prompt is required");
    }
    const model = params.model.trim() || "dall-e-3";
    const count = Math.min(Math.max(params.count ?? 1, 1), 4);
    const size = params.size?.trim() || "1024x1024";
    const authKey = apiKey.length > 0 ? apiKey : "ollama";

    const baseBody: Record<string, unknown> = {
      model,
      prompt,
      n: count,
      size,
    };

    try {
      const withB64 = await postOpenAiImages(baseUrl, authKey, {
        ...baseBody,
        response_format: "b64_json",
      });
      return normalizeOpenAiResults(withB64);
    } catch (firstError) {
      // Some compatible gateways reject response_format; retry without it.
      try {
        const fallback = await postOpenAiImages(baseUrl, authKey, baseBody);
        return normalizeOpenAiResults(fallback);
      } catch {
        throw firstError instanceof Error ? firstError : new Error(String(firstError));
      }
    }
  }

  return { generateImages };
}

/** Google Imagen via Generative Language API predict endpoint. */
export function createGoogleImagenClient(config: ImageClientConfig): AiImageClient {
  const apiKey = config.apiKey.trim();
  if (!apiKey) {
    throw new Error("API key is required for Google image generation");
  }

  async function generateImages(params: AiImageParams): Promise<readonly AiImageResult[]> {
    const prompt = params.prompt.trim();
    if (!prompt) {
      throw new Error("prompt is required");
    }
    const model = params.model.trim() || "imagen-3.0-generate-002";
    const sampleCount = Math.min(Math.max(params.count ?? 1, 1), 4);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predict?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount },
      }),
    });

    const json = (await response.json()) as {
      readonly predictions?: readonly { readonly bytesBase64Encoded?: string }[];
      readonly error?: { readonly message?: string };
    };

    if (!response.ok) {
      throw new Error(json.error?.message ?? `Google Imagen error (${response.status})`);
    }

    const predictions = json.predictions ?? [];
    const images = predictions
      .map((prediction) => prediction.bytesBase64Encoded)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((b64) => ({ url: toDataUrl(b64) }));

    if (images.length === 0) {
      throw new Error("Google Imagen returned no images");
    }
    return images;
  }

  return { generateImages };
}

export function createAiImageClient(config: ImageClientConfig): AiImageClient {
  const provider = normalizeProviderId(config.provider);

  if (provider === "mock") {
    return createMockAiImageClient();
  }

  if (provider === "openai" || provider === "openai-compatible") {
    return createOpenAiCompatibleImageClient(config);
  }

  if (provider === "google") {
    return createGoogleImagenClient(config);
  }

  if (provider === "local") {
    throw new Error(
      "Local/Ollama does not support image generation. Use ComfyUI for local diffusion, or openai-compatible / Google Imagen for API images.",
    );
  }

  if (provider === "comfyui") {
    return createComfyUiImageClient(config);
  }

  if (provider === "anthropic") {
    throw new Error("Anthropic image generation is not available. Use openai-compatible, google, or comfyui.");
  }

  throw new Error(`Unsupported image provider: ${config.provider}`);
}
