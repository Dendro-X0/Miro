import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { type LanguageModel } from "ai";
import { MockLanguageModelV3 } from "ai/test";

import {
  createAiImageClient,
  createMockAiImageClient,
  createOpenAiCompatibleImageClient,
  createGoogleImagenClient,
  DEFAULT_OPENAI_BASE_URL as IMAGE_DEFAULT_OPENAI_BASE_URL,
  type AiImageClient,
  type AiImageParams,
  type AiImageResult,
  type ImageClientConfig,
} from "./image";
import {
  GOLDEN_PATH_PROVIDERS,
  normalizeProviderId,
  type AiProviderId,
} from "./providers";
import { listModels } from "./list-models";
import { createWebSearchTool } from "./agent-tools";
import { searchWeb } from "./web-search";
import { providerSupportsTranscription, transcribeAudio } from "./transcribe";
import {
  buildTxt2ImgWorkflow,
  createComfyUiImageClient,
  DEFAULT_COMFYUI_BASE_URL,
  listComfyCheckpoints,
} from "./comfyui";

export type { AiProviderId };
export {
  GOLDEN_PATH_PROVIDERS,
  normalizeProviderId,
  createAiImageClient,
  createMockAiImageClient,
  createOpenAiCompatibleImageClient,
  createGoogleImagenClient,
  createComfyUiImageClient,
  buildTxt2ImgWorkflow,
  listComfyCheckpoints,
  listModels,
  createWebSearchTool,
  searchWeb,
  providerSupportsTranscription,
  transcribeAudio,
  DEFAULT_COMFYUI_BASE_URL,
};
export type { AiImageClient, AiImageParams, AiImageResult, ImageClientConfig };
export type { DiscoveredModel, ListModelsConfig } from "./list-models";
export type { WebSearchResult } from "./web-search";

export interface ModelConfig {
  readonly provider: string;
  readonly apiKey: string;
  readonly modelId: string;
  /** OpenAI-compatible base URL (e.g. OpenRouter, Groq, Ollama). */
  readonly baseUrl?: string;
}

export const DEFAULT_OPENAI_BASE_URL = IMAGE_DEFAULT_OPENAI_BASE_URL;
export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434/v1";
export const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";

function createOpenAiCompatibleModel(config: ModelConfig): LanguageModel {
  const baseURL =
    config.baseUrl?.trim() ||
    (normalizeProviderId(config.provider) === "local"
      ? DEFAULT_OLLAMA_BASE_URL
      : DEFAULT_OPENAI_BASE_URL);
  const apiKey =
    config.apiKey.trim().length > 0
      ? config.apiKey
      : normalizeProviderId(config.provider) === "local"
        ? "ollama"
        : config.apiKey;

  if (normalizeProviderId(config.provider) !== "local" && apiKey.length === 0) {
    throw new Error("API key is required for OpenAI-compatible providers");
  }

  const openai = createOpenAI({
    apiKey: apiKey.length > 0 ? apiKey : "ollama",
    baseURL,
  });
  return openai(config.modelId);
}

function createMockModel(): LanguageModel {
  return new MockLanguageModelV3({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "text-delta",
            id: "text-1",
            delta: "Hello! I am a mock AI assistant. ",
          });
          controller.enqueue({
            type: "text-delta",
            id: "text-1",
            delta: "How can I help you today?",
          });
          controller.close();
        },
      }),
      warnings: [],
    }),
  });
}

export function createModel(config: ModelConfig): LanguageModel {
  const provider = normalizeProviderId(config.provider);

  if (provider === "mock") {
    return createMockModel();
  }

  if (provider === "google") {
    if (!config.apiKey.trim()) {
      throw new Error("API key is required for Google provider");
    }
    const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
    return google(config.modelId);
  }

  if (provider === "anthropic") {
    if (!config.apiKey.trim()) {
      throw new Error("API key is required for Anthropic provider");
    }
    const anthropic = createAnthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl?.trim() || DEFAULT_ANTHROPIC_BASE_URL,
    });
    return anthropic(config.modelId);
  }

  if (provider === "openai" || provider === "openai-compatible" || provider === "local") {
    return createOpenAiCompatibleModel(config);
  }

  if (provider === "comfyui") {
    throw new Error(
      "ComfyUI is an image-only local diffusion bridge. Switch the chat model to OpenAI, Anthropic, Google, Custom, or Local (Ollama).",
    );
  }

  throw new Error(`Unsupported provider: ${config.provider}`);
}
