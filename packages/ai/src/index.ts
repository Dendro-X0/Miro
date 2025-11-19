export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessageBase {
  readonly id?: string;
  readonly role: ChatRole;
  readonly createdAt?: number;
}

export interface SystemMessage extends ChatMessageBase {
  readonly role: "system";
  readonly content: string;
}

export interface UserMessage extends ChatMessageBase {
  readonly role: "user";
  readonly content: string;
}

export interface AssistantMessage extends ChatMessageBase {
  readonly role: "assistant";
  readonly content: string;
  readonly toolCalls?: readonly ToolCall[];
}

export interface ToolMessage extends ChatMessageBase {
  readonly role: "tool";
  readonly toolCallId: string;
  readonly content: unknown;
}

export type ChatMessage = SystemMessage | UserMessage | AssistantMessage | ToolMessage;

export interface ToolSchema {
  readonly name: string;
  readonly description?: string;
  readonly parameters?: unknown;
}

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: unknown;
}

export interface ChatCompletionInput {
  readonly model?: string;
  readonly messages: readonly ChatMessage[];
  readonly tools?: readonly ToolSchema[];
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ChatCompletionChoice {
  readonly index: number;
  readonly message: ChatMessage;
  readonly finishReason?: "stop" | "length" | "tool_calls" | string;
}

export interface ChatCompletionResponse {
  readonly id?: string;
  readonly createdAt?: number;
  readonly model?: string;
  readonly choices: readonly ChatCompletionChoice[];
  readonly usage?: {
    readonly promptTokens?: number;
    readonly completionTokens?: number;
    readonly totalTokens?: number;
  };
}

export interface ChatCompletionChunk {
  readonly id?: string;
  readonly createdAt?: number;
  readonly model?: string;
  readonly choice: {
    readonly index: number;
    readonly delta: Partial<ChatMessage>;
    readonly finishReason?: "stop" | "length" | "tool_calls" | string;
  };
}

export interface ChatProvider {
  readonly createChatCompletion: (input: ChatCompletionInput) => Promise<ChatCompletionResponse>;
  readonly streamChatCompletion?: (input: ChatCompletionInput) => AsyncIterable<ChatCompletionChunk>;
}

export interface AiCompletionParams {
  readonly model: string;
  readonly prompt: string;
}

export interface AiCompletionResult {
  readonly text: string;
}

export interface AiClient {
  readonly provider: ChatProvider;
  readonly generateCompletion: (params: AiCompletionParams) => Promise<AiCompletionResult>;
}

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

export interface OpenAiClientConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

export function createMockChatProvider(): ChatProvider {
  async function createChatCompletion(input: ChatCompletionInput): Promise<ChatCompletionResponse> {
    const lastUser: UserMessage | undefined = input.messages
      .slice()
      .reverse()
      .find((message) => message.role === "user") as UserMessage | undefined;
    const previewSource: string = lastUser?.content ?? "";
    const trimmed: string = previewSource.trim();
    const preview: string = trimmed.length > 64 ? `${trimmed.slice(0, 61)}...` : trimmed;
    const modelName: string = input.model ?? "mock-model";
    const content: string = preview
      ? `Mock response from ${modelName}: ${preview}`
      : `Mock response from ${modelName}: (no user content)`;
    const message: AssistantMessage = { role: "assistant", content };
    const choice: ChatCompletionChoice = { index: 0, message };
    return { choices: [choice] };
  }
  return { createChatCompletion };
}

export function createMockAiClient(): AiClient {
  const provider: ChatProvider = createMockChatProvider();
  async function generateCompletion(params: AiCompletionParams): Promise<AiCompletionResult> {
    const system: SystemMessage = { role: "system", content: "You generate short textual responses." };
    const user: UserMessage = { role: "user", content: params.prompt };
    const input: ChatCompletionInput = { model: params.model, messages: [system, user] };
    const response: ChatCompletionResponse = await provider.createChatCompletion(input);
    const firstChoice: ChatCompletionChoice | undefined = response.choices[0];
    const text: string = (firstChoice?.message as AssistantMessage | undefined)?.content ?? "";
    return { text };
  }
  return { provider, generateCompletion };
}

interface OpenAiChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

interface OpenAiChatCompletionChoice {
  readonly index: number;
  readonly message: OpenAiChatMessage;
  readonly finish_reason?: string;
}

interface OpenAiChatCompletionUsage {
  readonly prompt_tokens?: number;
  readonly completion_tokens?: number;
  readonly total_tokens?: number;
}

interface OpenAiChatCompletionResponseBody {
  readonly id?: string;
  readonly created?: number;
  readonly model?: string;
  readonly choices: readonly OpenAiChatCompletionChoice[];
  readonly usage?: OpenAiChatCompletionUsage;
}

function buildOpenAiUrl(config: OpenAiClientConfig): string {
  const base: string = config.baseUrl.endsWith("/") ? config.baseUrl.slice(0, -1) : config.baseUrl;
  return `${base}/chat/completions`;
}

function mapToOpenAiMessages(messages: readonly ChatMessage[]): readonly OpenAiChatMessage[] {
  const result: OpenAiChatMessage[] = [];
  for (const message of messages) {
    if (message.role === "system") {
      const systemMessage: SystemMessage = message as SystemMessage;
      result.push({ role: "system", content: systemMessage.content });
    } else if (message.role === "user") {
      const userMessage: UserMessage = message as UserMessage;
      result.push({ role: "user", content: userMessage.content });
    } else if (message.role === "assistant") {
      const assistantMessage: AssistantMessage = message as AssistantMessage;
      result.push({ role: "assistant", content: assistantMessage.content });
    }
  }
  return result;
}

function mapFromOpenAiResponse(body: OpenAiChatCompletionResponseBody): ChatCompletionResponse {
  const choices: ChatCompletionChoice[] = body.choices.map((choice) => {
    const message: ChatMessage = {
      role: choice.message.role,
      content: choice.message.content,
    } as AssistantMessage | SystemMessage | UserMessage;
    const mapped: ChatCompletionChoice = {
      index: choice.index,
      message,
      finishReason: choice.finish_reason,
    };
    return mapped;
  });
  const usageBody: OpenAiChatCompletionUsage | undefined = body.usage;
  const usageMapped: ChatCompletionResponse["usage"] | undefined = usageBody
    ? {
        promptTokens: usageBody.prompt_tokens,
        completionTokens: usageBody.completion_tokens,
        totalTokens: usageBody.total_tokens,
      }
    : undefined;
  const response: ChatCompletionResponse = {
    id: body.id,
    createdAt: body.created,
    model: body.model,
    choices,
    usage: usageMapped,
  };
  return response;
}

export function createOpenAiChatProvider(config: OpenAiClientConfig): ChatProvider {
  const url: string = buildOpenAiUrl(config);

  async function createChatCompletion(input: ChatCompletionInput): Promise<ChatCompletionResponse> {
    const messages: readonly OpenAiChatMessage[] = mapToOpenAiMessages(input.messages);
    const requestBody: Readonly<Record<string, unknown>> = {
      model: input.model,
      messages,
      temperature: input.temperature,
      max_tokens: input.maxTokens,
    };
    const headers: Readonly<Record<string, string>> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    };
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      throw new Error(`OpenAI chat completion failed with status ${response.status}`);
    }
    const rawBody: unknown = await response.json();
    const body: OpenAiChatCompletionResponseBody = rawBody as OpenAiChatCompletionResponseBody;
    return mapFromOpenAiResponse(body);
  }

  const provider: ChatProvider = { createChatCompletion };
  return provider;
}

export function createOpenAiAiClient(config: OpenAiClientConfig): AiClient {
  const provider: ChatProvider = createOpenAiChatProvider(config);

  async function generateCompletion(params: AiCompletionParams): Promise<AiCompletionResult> {
    const system: SystemMessage = { role: "system", content: "You generate short textual responses." };
    const user: UserMessage = { role: "user", content: params.prompt };
    const input: ChatCompletionInput = { model: params.model, messages: [system, user] };
    const response: ChatCompletionResponse = await provider.createChatCompletion(input);
    const firstChoice: ChatCompletionChoice | undefined = response.choices[0];
    const assistantChoice: AssistantMessage | undefined = firstChoice?.message as AssistantMessage | undefined;
    const text: string = assistantChoice?.content ?? "";
    const result: AiCompletionResult = { text };
    return result;
  }

  const client: AiClient = { provider, generateCompletion };
  return client;
}

export function createMockAiImageClient(): AiImageClient {
  async function generateImages(params: AiImageParams): Promise<readonly AiImageResult[]> {
    const countRaw: number = params.count ?? 1;
    const count: number = countRaw > 0 && countRaw <= 8 ? countRaw : 1;
    const baseUrl: string = "https://placehold.co/512x512";
    const items: AiImageResult[] = [];
    for (let index: number = 0; index < count; index += 1) {
      const url: string = `${baseUrl}?text=Miro+Mock+Image+${index + 1}`;
      items.push({ url });
    }
    return items;
  }
  const client: AiImageClient = { generateImages };
  return client;
}

interface OpenAiImageGenerationResultBody {
  readonly url?: string;
  readonly b64_json?: string;
}

interface OpenAiImageGenerationResponseBody {
  readonly data: readonly OpenAiImageGenerationResultBody[];
}

export function createOpenAiImageClient(config: OpenAiClientConfig): AiImageClient {
  const base: string = config.baseUrl.endsWith("/") ? config.baseUrl.slice(0, -1) : config.baseUrl;
  const url: string = `${base}/images/generations`;

  async function generateImages(params: AiImageParams): Promise<readonly AiImageResult[]> {
    const countRaw: number = params.count ?? 1;
    const count: number = countRaw > 0 && countRaw <= 8 ? countRaw : 1;
    const size: string | undefined = params.size;
    const requestBody: Readonly<Record<string, unknown>> = {
      model: params.model,
      prompt: params.prompt,
      n: count,
      size,
    };
    const headers: Readonly<Record<string, string>> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    };
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      throw new Error(`OpenAI image generation failed with status ${response.status}`);
    }
    const rawBody: unknown = await response.json();
    const body: OpenAiImageGenerationResponseBody = rawBody as OpenAiImageGenerationResponseBody;
    const images: AiImageResult[] = [];
    for (const item of body.data) {
      if (item.url) {
        images.push({ url: item.url });
      }
    }
    return images;
  }

  const client: AiImageClient = { generateImages };
  return client;
}
