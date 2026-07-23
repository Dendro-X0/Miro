import { normalizeProviderId } from "./providers";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434/v1";

export interface TranscribeAudioConfig {
  readonly provider: string;
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly file: Blob;
  readonly filename?: string;
  readonly language?: string;
  readonly model?: string;
}

function resolveTranscriptionBaseUrl(provider: string, baseUrl?: string): string {
  const trimmed = baseUrl?.trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, "");
  }
  const id = normalizeProviderId(provider);
  if (id === "local") {
    return DEFAULT_OLLAMA_BASE_URL.replace(/\/$/, "");
  }
  return DEFAULT_OPENAI_BASE_URL.replace(/\/$/, "");
}

export function providerSupportsTranscription(provider: string): boolean {
  const id = normalizeProviderId(provider);
  return id === "openai" || id === "openai-compatible" || id === "local";
}

/**
 * Transcribe audio via OpenAI-compatible `/audio/transcriptions` (Whisper).
 */
export async function transcribeAudio(config: TranscribeAudioConfig): Promise<string> {
  const provider = normalizeProviderId(config.provider);
  if (!providerSupportsTranscription(provider)) {
    throw new Error(
      "Voice transcription needs an OpenAI-compatible provider (OpenAI, Custom, or Local with Whisper).",
    );
  }

  const apiKey =
    config.apiKey.trim().length > 0
      ? config.apiKey.trim()
      : provider === "local"
        ? "ollama"
        : "";
  if (provider !== "local" && apiKey.length === 0) {
    throw new Error("Add an OpenAI-compatible API key in Settings to use voice input.");
  }

  const baseUrl = resolveTranscriptionBaseUrl(provider, config.baseUrl);
  const form = new FormData();
  const filename = config.filename ?? "recording.webm";
  form.append("file", config.file, filename);
  form.append("model", config.model?.trim() || "whisper-1");
  if (config.language?.trim()) {
    form.append("language", config.language.trim());
  }

  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      detail.trim().length > 0
        ? `Transcription failed (${response.status}): ${detail.slice(0, 240)}`
        : `Transcription failed (${response.status}).`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await response.json()) as { readonly text?: string };
    const text = body.text?.trim() ?? "";
    if (!text) {
      throw new Error("Transcription returned empty text.");
    }
    return text;
  }

  const text = (await response.text()).trim();
  if (!text) {
    throw new Error("Transcription returned empty text.");
  }
  return text;
}
