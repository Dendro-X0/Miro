import type { AiConfigResponse, AiModelsListRequest, AiModelsListResponse } from "../types/ai-config";
import type { ApiChatRequest, ApiUiMessage } from "../types/chat";
import { miroApiPaths } from "../config/paths";
import { resolveMiroApiBaseUrl } from "../config/env";

export interface MiroApiClientOptions {
  readonly baseUrl: string;
}

export interface CreateMiroApiClientOptions {
  readonly baseUrl?: string;
  /** Use same-origin relative URLs (for Next.js rewrites in miro-web). */
  readonly sameOrigin?: boolean;
}

export interface StreamChatOptions {
  readonly messages: readonly ApiUiMessage[];
  readonly model?: string;
  readonly provider?: string;
  readonly byokKey?: string;
  readonly baseUrl?: string;
  readonly signal?: AbortSignal;
  readonly systemPrompt?: string;
}

export interface GenerateImageParams {
  readonly prompt: string;
  readonly model?: string;
  readonly provider?: string;
  readonly byokKey?: string;
  readonly baseUrl?: string;
  readonly size?: string;
}

export interface GenerateImageResult {
  readonly images: readonly { readonly url: string }[];
}

export function createMiroApiClient(options: CreateMiroApiClientOptions = {}): MiroApiClient {
  if (options.sameOrigin) {
    return new MiroApiClient({ baseUrl: "" });
  }
  return new MiroApiClient({ baseUrl: options.baseUrl ?? resolveMiroApiBaseUrl() });
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

function toUiMessages(messages: readonly ApiUiMessage[]): readonly ApiUiMessage[] {
  return messages.map((message) => {
    if (message.parts && message.parts.length > 0) {
      return message;
    }
    if (message.content !== undefined) {
      return {
        role: message.role,
        parts: [{ type: "text", text: message.content }],
      };
    }
    return { role: message.role, parts: [{ type: "text", text: "" }] };
  });
}

export async function readUiMessageStreamText(response: Response): Promise<string> {
  const raw = await response.text();
  if (!raw) {
    return "";
  }

  const deltas: string[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("0:")) {
      try {
        const payload = JSON.parse(trimmed.slice(2)) as string | { type?: string; textDelta?: string };
        if (typeof payload === "string") {
          deltas.push(payload);
          continue;
        }
        if (payload.type === "text-delta" && typeof payload.textDelta === "string") {
          deltas.push(payload.textDelta);
        }
      } catch {
        // Fall through to plain-text heuristics below.
      }
    }
  }

  if (deltas.length > 0) {
    return deltas.join("").trim();
  }

  return raw.trim();
}

export class MiroApiClient {
  private readonly baseUrl: string;

  constructor(options: MiroApiClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async fetchConfig(): Promise<AiConfigResponse> {
    const response = await fetch(`${this.baseUrl}${miroApiPaths.config}`);
    if (!response.ok) {
      throw new Error(`Failed to load AI config (${response.status})`);
    }
    return (await response.json()) as AiConfigResponse;
  }

  async listModels(request: AiModelsListRequest): Promise<AiModelsListResponse> {
    const response = await fetch(`${this.baseUrl}${miroApiPaths.models}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      let detail = `Failed to list models (${response.status})`;
      try {
        const payload = (await response.json()) as { readonly error?: string };
        if (payload.error) {
          detail = payload.error;
        }
      } catch {
        // keep status text
      }
      throw new Error(detail);
    }
    return (await response.json()) as AiModelsListResponse;
  }

  async streamChat(options: StreamChatOptions): Promise<Response> {
    const body: ApiChatRequest = {
      messages: toUiMessages(options.messages),
      model: options.model,
      provider: options.provider,
      byokKey: options.byokKey,
      baseUrl: options.baseUrl,
      systemPrompt: options.systemPrompt,
    };

    const response = await fetch(`${this.baseUrl}${miroApiPaths.chat}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(`Chat request failed (${response.status})`);
    }

    return response;
  }

  async completeChat(options: StreamChatOptions): Promise<string> {
    const response = await this.streamChat(options);
    return readUiMessageStreamText(response);
  }

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
    const response = await fetch(`${this.baseUrl}${miroApiPaths.image}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      let detail = `Image request failed (${response.status})`;
      try {
        const payload = (await response.json()) as { readonly error?: string };
        if (payload.error) {
          detail = payload.error;
        }
      } catch {
        // keep status text
      }
      throw new Error(detail);
    }

    return (await response.json()) as GenerateImageResult;
  }
}
