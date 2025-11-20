import type {
  AiClient,
  AiCompletionParams,
  AiCompletionResult,
  ChatCompletionInput,
  ChatCompletionResponse,
  ChatMessage,
  OpenAiClientConfig,
  AiImageClient,
  AiImageParams,
  AiImageResult,
} from "@miro/ai";
import {
  createMockAiClient,
  createMockAiImageClient,
  createOpenAiAiClient,
  createOpenAiImageClient,
} from "@miro/ai";
import type { ApiConfig, AiConfig } from "../config";
import { isAiRateLimited, resolveModelId, truncateMessagesForV2 } from "../ai-helpers";
import type { AppContext, AppInstance } from "../types";

const DEFAULT_IMAGE_MODEL: string = process.env.MIRO_AI_IMAGE_MODEL?.trim() ?? "gpt-image-1";

interface AiCompleteRequestBody {
  readonly prompt: string;
  readonly model?: string;
}

interface AiCompleteResponseBody {
  readonly text: string;
}

function isAiCompleteRequestBody(value: unknown): value is AiCompleteRequestBody {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record: Record<string, unknown> = value as Record<string, unknown>;
  if (typeof record.prompt !== "string") {
    return false;
  }
  if ("model" in record && typeof record.model !== "string") {
    return false;
  }
  return true;
}

interface AiChatRequestBody {
  readonly messages: readonly ChatMessage[];
  readonly model?: string;
}

interface AiChatResponseBody {
  readonly completion: ChatCompletionResponse;
}

function isAiChatRequestBody(value: unknown): value is AiChatRequestBody {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record: Record<string, unknown> = value as Record<string, unknown>;
  if (!Array.isArray(record.messages)) {
    return false;
  }
  for (const item of record.messages) {
    if (item === null || typeof item !== "object") {
      return false;
    }
    const messageRecord: Record<string, unknown> = item as Record<string, unknown>;
    if (typeof messageRecord.role !== "string") {
      return false;
    }
  }
  if ("model" in record && typeof record.model !== "string") {
    return false;
  }
  return true;
}

interface AiCompleteV2RequestBody {
  readonly prompt: string;
  readonly model?: string;
  readonly byokKey?: string;
}

function isAiCompleteV2RequestBody(value: unknown): value is AiCompleteV2RequestBody {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record: Record<string, unknown> = value as Record<string, unknown>;
  if (typeof record.prompt !== "string") {
    return false;
  }
  if ("model" in record && typeof record.model !== "string") {
    return false;
  }
  if ("byokKey" in record && typeof record.byokKey !== "string") {
    return false;
  }
  return true;
}

interface AiChatV2RequestBody {
  readonly messages: readonly ChatMessage[];
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly byokKey?: string;
}

function isAiChatV2RequestBody(value: unknown): value is AiChatV2RequestBody {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record: Record<string, unknown> = value as Record<string, unknown>;
  if (!Array.isArray(record.messages)) {
    return false;
  }
  for (const item of record.messages) {
    if (item === null || typeof item !== "object") {
      return false;
    }
    const messageRecord: Record<string, unknown> = item as Record<string, unknown>;
    if (typeof messageRecord.role !== "string") {
      return false;
    }
  }
  if ("model" in record && typeof record.model !== "string") {
    return false;
  }
  if ("temperature" in record && typeof record.temperature !== "number") {
    return false;
  }
  if ("maxTokens" in record && typeof record.maxTokens !== "number") {
    return false;
  }
  if ("byokKey" in record && typeof record.byokKey !== "string") {
    return false;
  }
  return true;
}

interface AiImageV2RequestBody {
  readonly prompt: string;
  readonly model?: string;
  readonly size?: string;
  readonly count?: number;
  readonly byokKey?: string;
}

function isAiImageV2RequestBody(value: unknown): value is AiImageV2RequestBody {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record: Record<string, unknown> = value as Record<string, unknown>;
  if (typeof record.prompt !== "string") {
    return false;
  }
  if ("model" in record && typeof record.model !== "string") {
    return false;
  }
  if ("size" in record && typeof record.size !== "string") {
    return false;
  }
  if ("count" in record && typeof record.count !== "number") {
    return false;
  }
  if ("byokKey" in record && typeof record.byokKey !== "string") {
    return false;
  }
  return true;
}

interface AiImageV2ResponseBody {
  readonly images: readonly AiImageResult[];
}

export interface AiRouteDeps {
  readonly app: AppInstance;
  readonly apiConfig: ApiConfig;
  readonly aiClient: AiClient;
  readonly imageClient: AiImageClient;
}

export function createAiClientFromConfig(config: ApiConfig): AiClient {
  const providerName = config.ai.provider;
  const apiKey: string | null = config.ai.apiKey;
  if (providerName === "openai" || providerName === "local") {
    const openAiConfig: OpenAiClientConfig = {
      baseUrl: config.ai.baseUrl,
      apiKey: apiKey as string,
    };
    return createOpenAiAiClient(openAiConfig);
  }
  return createMockAiClient();
}

export function createImageClientFromConfig(config: ApiConfig): AiImageClient {
  const apiKey: string | null = config.ai.apiKey;
  if (apiKey) {
    const openAiConfig: OpenAiClientConfig = {
      baseUrl: config.ai.baseUrl,
      apiKey,
    };
    return createOpenAiImageClient(openAiConfig);
  }
  return createMockAiImageClient();
}

interface GetAiClientForRequestInput {
  readonly apiConfig: ApiConfig;
  readonly baseClient: AiClient;
  readonly byokKey?: string;
}

function getAiClientForRequest(input: GetAiClientForRequestInput): AiClient {
  const trimmed: string = input.byokKey?.trim() ?? "";
  if (trimmed.length === 0) {
    return input.baseClient;
  }
  const providerName: string = input.apiConfig.ai.provider;
  if (providerName === "openai" || providerName === "local") {
    const openAiConfig: OpenAiClientConfig = {
      baseUrl: input.apiConfig.ai.baseUrl,
      apiKey: trimmed,
    };
    const client: AiClient = createOpenAiAiClient(openAiConfig);
    return client;
  }
  return input.baseClient;
}

interface GetImageClientForRequestInput {
  readonly apiConfig: ApiConfig;
  readonly baseClient: AiImageClient;
  readonly byokKey?: string;
}

function getImageClientForRequest(input: GetImageClientForRequestInput): AiImageClient {
  const trimmed: string = input.byokKey?.trim() ?? "";
  if (trimmed.length === 0) {
    return input.baseClient;
  }
  const providerName: string = input.apiConfig.ai.provider;
  if (providerName === "openai" || providerName === "local") {
    const openAiConfig: OpenAiClientConfig = {
      baseUrl: input.apiConfig.ai.baseUrl,
      apiKey: trimmed,
    };
    const client: AiImageClient = createOpenAiImageClient(openAiConfig);
    return client;
  }
  return input.baseClient;
}

async function handleAiComplete(context: AppContext, client: AiClient): Promise<Response> {
  const rawBody: unknown = await context.req.json();
  if (!isAiCompleteRequestBody(rawBody)) {
    return context.json({ error: "Invalid request body" } as const, 400);
  }
  const requestBody: AiCompleteRequestBody = rawBody;
  const params: AiCompletionParams = {
    model: requestBody.model ?? "mock-model",
    prompt: requestBody.prompt,
  };
  const result: AiCompletionResult = await client.generateCompletion(params);
  const responseBody: AiCompleteResponseBody = { text: result.text };
  return context.json(responseBody);
}

async function handleAiChat(context: AppContext, client: AiClient): Promise<Response> {
  const rawBody: unknown = await context.req.json();
  if (!isAiChatRequestBody(rawBody)) {
    return context.json({ error: "Invalid request body" } as const, 400);
  }
  const requestBody: AiChatRequestBody = rawBody;
  const input: ChatCompletionInput = {
    model: requestBody.model ?? "mock-model",
    messages: requestBody.messages,
  };
  const completion: ChatCompletionResponse = await client.provider.createChatCompletion(input);
  const responseBody: AiChatResponseBody = { completion };
  return context.json(responseBody);
}

async function handleAiCompleteV2(
  context: AppContext,
  apiConfig: ApiConfig,
  baseClient: AiClient,
): Promise<Response> {
  if (isAiRateLimited(context)) {
    return context.json({ error: "Rate limit exceeded" } as const, 429);
  }
  let rawBody: unknown;
  try {
    rawBody = await context.req.json();
  } catch {
    return context.json({ error: "Invalid JSON body" } as const, 400);
  }
  if (!isAiCompleteV2RequestBody(rawBody)) {
    return context.json({ error: "Invalid request body" } as const, 400);
  }
  const requestBody: AiCompleteV2RequestBody = rawBody;
  const model: string = resolveModelId(requestBody.model, apiConfig.ai.models);
  const params: AiCompletionParams = {
    model,
    prompt: requestBody.prompt,
  };
  try {
    const client: AiClient = getAiClientForRequest({ apiConfig, baseClient, byokKey: requestBody.byokKey });
    const result: AiCompletionResult = await client.generateCompletion(params);
    const responseBody: AiCompleteResponseBody = { text: result.text };
    return context.json(responseBody);
  } catch {
    return context.json({ error: "AI provider error" } as const, 502);
  }
}

async function handleAiImageV2(
  context: AppContext,
  apiConfig: ApiConfig,
  baseClient: AiImageClient,
): Promise<Response> {
  if (isAiRateLimited(context)) {
    return context.json({ error: "Rate limit exceeded" } as const, 429);
  }
  let rawBody: unknown;
  try {
    rawBody = await context.req.json();
  } catch {
    return context.json({ error: "Invalid JSON body" } as const, 400);
  }
  if (!isAiImageV2RequestBody(rawBody)) {
    return context.json({ error: "Invalid request body" } as const, 400);
  }
  const requestBody: AiImageV2RequestBody = rawBody;
  const trimmedModel: string = requestBody.model?.trim() ?? "";
  const model: string = trimmedModel.length > 0 ? trimmedModel : DEFAULT_IMAGE_MODEL;
  const size: string | undefined = requestBody.size;
  const countRaw: number = requestBody.count ?? 1;
  const count: number = countRaw > 0 && countRaw <= 8 ? countRaw : 1;
  const params: AiImageParams = {
    model,
    prompt: requestBody.prompt,
    size,
    count,
  };
  try {
    const client: AiImageClient = getImageClientForRequest({
      apiConfig,
      baseClient,
      byokKey: requestBody.byokKey,
    });
    const images: readonly AiImageResult[] = await client.generateImages(params);
    const responseBody: AiImageV2ResponseBody = { images };
    return context.json(responseBody);
  } catch {
    return context.json({ error: "AI provider error" } as const, 502);
  }
}

async function handleAiChatV2(
  context: AppContext,
  apiConfig: ApiConfig,
  baseClient: AiClient,
): Promise<Response> {
  if (isAiRateLimited(context)) {
    return context.json({ error: "Rate limit exceeded" } as const, 429);
  }
  let rawBody: unknown;
  try {
    rawBody = await context.req.json();
  } catch {
    return context.json({ error: "Invalid JSON body" } as const, 400);
  }
  if (!isAiChatV2RequestBody(rawBody)) {
    return context.json({ error: "Invalid request body" } as const, 400);
  }
  const requestBody: AiChatV2RequestBody = rawBody;
  const trimmedMessages: readonly ChatMessage[] = truncateMessagesForV2(requestBody.messages);
  const input: ChatCompletionInput = {
    model: resolveModelId(requestBody.model, apiConfig.ai.models),
    messages: trimmedMessages,
    temperature: requestBody.temperature,
    maxTokens: requestBody.maxTokens,
  };
  try {
    const client: AiClient = getAiClientForRequest({ apiConfig, baseClient, byokKey: requestBody.byokKey });
    const completion: ChatCompletionResponse = await client.provider.createChatCompletion(input);
    const responseBody: AiChatResponseBody = { completion };
    return context.json(responseBody);
  } catch {
    return context.json({ error: "AI provider error" } as const, 502);
  }
}

export function registerAiRoutes(deps: AiRouteDeps): void {
  const { app, apiConfig, aiClient, imageClient } = deps;

  app.get("/ai/config", (context: AppContext) => {
    const ai: AiConfig = apiConfig.ai;
    const ready: boolean = ai.provider === "mock" || ai.apiKey !== null;
    return context.json(
      {
        provider: ai.provider,
        baseUrl: ai.baseUrl,
        models: ai.models,
        ready,
        runtime: ai.runtime,
      } as const,
    );
  });

  app.post("/ai/complete", async (context: AppContext) => handleAiComplete(context, aiClient));

  app.post("/ai/chat", async (context: AppContext) => handleAiChat(context, aiClient));

  app.post("/v2/ai/complete", async (context: AppContext) => handleAiCompleteV2(context, apiConfig, aiClient));
  app.post("/v2/ai/chat", async (context: AppContext) => handleAiChatV2(context, apiConfig, aiClient));
  app.post("/v2/ai/image", async (context: AppContext) => handleAiImageV2(context, apiConfig, imageClient));
}
