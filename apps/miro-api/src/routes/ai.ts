import { streamText } from "ai";
import type { AiImageClient } from "@miro/ai";
import {
  createAiImageClient,
  createMockAiImageClient,
  createModel,
  listModels,
  normalizeProviderId,
  type ModelConfig,
} from "@miro/ai";

import type { ApiConfig, AiConfig, AiRuntimeProvider } from "../config";
import { buildModelCacheKey, getCachedModels, setCachedModels } from "../model-cache";
import type { AppContext, AppInstance } from "../types";
import {
  isAiRateLimited,
  truncateMessagesForV2,
  type RateLimitContext,
} from "../ai-helpers";

interface UIMessage {
  role: "user" | "assistant" | "system";
  content?: string;
  parts?: Array<{ type: "text"; text: string } | { type: "image"; image: string }>;
}

interface CoreMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<unknown>;
}

interface ChatRequestBody {
  readonly messages: UIMessage[];
  readonly model?: string;
  readonly provider?: string;
  readonly byokKey?: string;
  readonly baseUrl?: string;
  readonly systemPrompt?: string;
}

interface ImageRequestBody {
  readonly prompt?: string;
  readonly model?: string;
  readonly provider?: string;
  readonly byokKey?: string;
  readonly baseUrl?: string;
  readonly size?: string;
}

interface ModelsRequestBody {
  readonly provider?: string;
  readonly byokKey?: string;
  readonly baseUrl?: string;
}

function toImagePart(image: string): { type: "image"; image: URL | string } {
  if (image.startsWith("data:")) {
    return { type: "image", image };
  }
  return { type: "image", image: new URL(image) };
}

function convertToCoreMessages(messages: UIMessage[]): CoreMessage[] {
  return messages.map((m) => {
    if (m.parts) {
      return {
        role: m.role,
        content: m.parts.map((p) =>
          p.type === "text" ? { type: "text", text: p.text } : toImagePart(p.image),
        ),
      };
    }
    return { role: m.role, content: m.content ?? "" };
  });
}

function findRuntimeProvider(
  ai: AiConfig,
  providerId: string,
): AiRuntimeProvider | undefined {
  return ai.runtime.providers.find((provider) => provider.id === providerId);
}

function findProviderEnvKey(providerId: string): string {
  if (providerId === "openai" || providerId === "openai-compatible") {
    return process.env.MIRO_AI_OPENAI_API_KEY?.trim() ?? process.env.MIRO_AI_API_KEY?.trim() ?? "";
  }
  if (providerId === "google") {
    return process.env.MIRO_AI_GOOGLE_API_KEY?.trim() ?? process.env.MIRO_AI_API_KEY?.trim() ?? "";
  }
  if (providerId === "anthropic") {
    return process.env.MIRO_AI_ANTHROPIC_API_KEY?.trim() ?? process.env.MIRO_AI_API_KEY?.trim() ?? "";
  }
  return "";
}

function resolveProviderCredentials(
  apiConfig: ApiConfig,
  body: { readonly provider?: string; readonly byokKey?: string; readonly baseUrl?: string },
): { readonly provider: string; readonly apiKey: string; readonly baseUrl?: string } {
  const requestedProvider = body.provider
    ? normalizeProviderId(body.provider)
    : normalizeProviderId(apiConfig.ai.provider);
  const runtimeProvider = findRuntimeProvider(apiConfig.ai, requestedProvider);
  const byokKey = body.byokKey?.trim() ?? "";
  const envKey = apiConfig.ai.apiKey ?? "";
  const apiKey =
    byokKey.length > 0
      ? byokKey
      : requestedProvider === apiConfig.ai.provider
        ? envKey
        : findProviderEnvKey(requestedProvider) || envKey;

  const baseUrl =
    body.baseUrl?.trim() ||
    runtimeProvider?.baseUrl ||
    (requestedProvider === apiConfig.ai.provider ? apiConfig.ai.baseUrl : undefined);

  return { provider: requestedProvider, apiKey, baseUrl };
}

function resolveModelConfig(apiConfig: ApiConfig, body: ChatRequestBody): ModelConfig {
  const credentials = resolveProviderCredentials(apiConfig, body);
  const runtimeProvider = findRuntimeProvider(apiConfig.ai, credentials.provider);

  const modelId =
    body.model?.trim() ||
    apiConfig.ai.models.balanced ||
    runtimeProvider?.models.find((model) => model.kind === "text")?.id ||
    "gpt-4o-mini";

  return {
    provider: credentials.provider,
    apiKey: credentials.apiKey,
    modelId,
    baseUrl: credentials.baseUrl,
  };
}

function resolveImageModelId(apiConfig: ApiConfig, body: ImageRequestBody, providerId: string): string {
  if (body.model?.trim()) {
    return body.model.trim();
  }
  const runtimeProvider = findRuntimeProvider(apiConfig.ai, providerId);
  const fromRuntime = runtimeProvider?.models.find((model) => model.kind === "image")?.id;
  if (fromRuntime) {
    return fromRuntime;
  }
  if (providerId === "google") {
    return process.env.MIRO_AI_GOOGLE_MODEL_IMAGE?.trim() || "imagen-3.0-generate-002";
  }
  return (
    process.env.MIRO_AI_OPENAI_IMAGE_MODEL?.trim() ||
    process.env.MIRO_AI_IMAGE_MODEL?.trim() ||
    "dall-e-3"
  );
}

export interface AiRouteDeps {
  readonly app: AppInstance;
  readonly apiConfig: ApiConfig;
  readonly imageClient: AiImageClient;
}

export function createImageClientFromConfig(config: ApiConfig): AiImageClient {
  try {
    return createAiImageClient({
      provider: config.ai.provider,
      apiKey: config.ai.apiKey ?? "",
      baseUrl: config.ai.baseUrl,
    });
  } catch {
    return createMockAiImageClient();
  }
}

async function handleChat(context: AppContext, apiConfig: ApiConfig): Promise<Response> {
  const rateLimitContext: RateLimitContext = {
    req: {
      header: (name: string) => context.req.header(name) ?? undefined,
    },
    get: <T,>(key: string): T | undefined => {
      try {
        return context.get(key as never) as T | undefined;
      } catch {
        return undefined;
      }
    },
  };
  if (isAiRateLimited(rateLimitContext)) {
    return context.json({ error: "Rate limit exceeded. Try again shortly." }, 429);
  }

  let body: ChatRequestBody;
  try {
    body = (await context.req.json()) as ChatRequestBody;
  } catch {
    return context.json({ error: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(body.messages)) {
    return context.json({ error: "messages must be an array" }, 400);
  }

  const config = resolveModelConfig(apiConfig, body);
  const systemPrompt = body.systemPrompt?.trim();

  try {
    const model = createModel(config);
    const coreMessages = truncateMessagesForV2(convertToCoreMessages(body.messages));

    const result = await streamText({
      model,
      messages: coreMessages as never,
      ...(systemPrompt ? { system: systemPrompt } : {}),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate response";
    return context.json({ error: message }, 500);
  }
}

async function handleImage(context: AppContext, apiConfig: ApiConfig): Promise<Response> {
  let body: ImageRequestBody;
  try {
    body = (await context.req.json()) as ImageRequestBody;
  } catch {
    return context.json({ error: "Invalid JSON body" }, 400);
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return context.json({ error: "prompt is required" }, 400);
  }

  try {
    const credentials = resolveProviderCredentials(apiConfig, body);
    const model = resolveImageModelId(apiConfig, body, credentials.provider);
    const imageClient = createAiImageClient({
      provider: credentials.provider,
      apiKey: credentials.apiKey,
      baseUrl: credentials.baseUrl,
    });
    const images = await imageClient.generateImages({
      prompt,
      model,
      size: body.size,
    });
    return context.json({ images });
  } catch (error) {
    console.error("Image error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate image";
    return context.json({ error: message }, 500);
  }
}

async function handleModels(context: AppContext, apiConfig: ApiConfig): Promise<Response> {
  let body: ModelsRequestBody;
  try {
    body = (await context.req.json()) as ModelsRequestBody;
  } catch {
    return context.json({ error: "Invalid JSON body" }, 400);
  }

  const credentials = resolveProviderCredentials(apiConfig, body);
  const cacheKey = buildModelCacheKey(
    credentials.provider,
    credentials.baseUrl,
    credentials.apiKey,
  );
  const cached = getCachedModels(cacheKey);
  if (cached) {
    return context.json({
      provider: credentials.provider,
      models: cached,
      cached: true,
    });
  }

  try {
    const models = await listModels({
      provider: credentials.provider,
      apiKey: credentials.apiKey,
      baseUrl: credentials.baseUrl,
    });
    setCachedModels(cacheKey, models);
    return context.json({
      provider: credentials.provider,
      models,
      cached: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list models";
    return context.json({
      provider: credentials.provider,
      models: [],
      cached: false,
      error: message,
    });
  }
}

export function registerAiRoutes(deps: AiRouteDeps): void {
  const { app, apiConfig } = deps;

  app.get("/ai/config", (context: AppContext) => {
    const ai: AiConfig = apiConfig.ai;
    return context.json({
      provider: ai.provider,
      models: ai.models,
      ready: ai.apiKey !== null || ai.provider === "mock" || ai.provider === "local",
      runtime: ai.runtime,
      image: {
        path: "api",
        providers: ["mock", "openai", "openai-compatible", "google"],
        deferred: ["comfyui"],
      },
    });
  });

  app.post("/api/chat", async (context: AppContext) => handleChat(context, apiConfig));
  app.post("/ai/models", async (context: AppContext) => handleModels(context, apiConfig));
  app.post("/v2/ai/image", async (context: AppContext) => handleImage(context, apiConfig));
}
