import type { AiModelFilterTag } from "../_settings-store";

interface AiProviderPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly supportsByok: boolean;
  readonly badge?: string;
}

type AiModelTier = "default" | "fast" | "quality" | "local";

interface AiModelPreset {
  readonly id: string;
  readonly providerId: string;
  readonly label: string;
  readonly description: string;
  readonly tier: AiModelTier;
  readonly tags: readonly AiModelFilterTag[];
}

interface AiModelConfig {
  readonly providers: readonly AiProviderPreset[];
  readonly models: readonly AiModelPreset[];
}

const aiModelConfig: AiModelConfig = {
  providers: [
    {
      id: "openai-compatible",
      label: "OpenAI compatible",
      description: "Connect your own OpenAI-compatible API key.",
      supportsByok: true,
    },
    {
      id: "anthropic",
      label: "Anthropic",
      description: "Use Claude models with your own key.",
      supportsByok: true,
    },
    {
      id: "google",
      label: "Google Gemini",
      description: "Use Gemini and Imagen models with your own key.",
      supportsByok: true,
    },
    {
      id: "local",
      label: "Local model",
      description: "Use models running on your own infrastructure.",
      supportsByok: true,
    },
  ],
  models: [
    {
      id: "gpt-5",
      providerId: "openai-compatible",
      label: "GPT-5",
      description: "General-purpose OpenAI model.",
      tier: "quality",
      tags: ["text", "quality"],
    },
    {
      id: "gpt-5.1",
      providerId: "openai-compatible",
      label: "GPT-5.1",
      description: "Recent OpenAI release with improved reasoning.",
      tier: "quality",
      tags: ["text", "quality"],
    },
    {
      id: "gpt-image-gen",
      providerId: "openai-compatible",
      label: "GPTImageGen",
      description: "OpenAI image generation model.",
      tier: "quality",
      tags: ["image", "quality"],
    },
    {
      id: "claude-4-sonnet",
      providerId: "anthropic",
      label: "Claude 4 Sonnet",
      description: "Balanced Anthropic model.",
      tier: "quality",
      tags: ["text", "quality"],
    },
    {
      id: "claude-4.5-sonnet",
      providerId: "anthropic",
      label: "Claude 4.5 Sonnet",
      description: "Updated Claude Sonnet model.",
      tier: "quality",
      tags: ["text", "quality"],
    },
    {
      id: "claude-4.5-haiku",
      providerId: "anthropic",
      label: "Claude 4.5 Haiku",
      description: "Fast Claude model.",
      tier: "fast",
      tags: ["text", "fast"],
    },
    {
      id: "gemini-2.5-flash",
      providerId: "google",
      label: "Gemini 2.5 Flash",
      description: "Fast Gemini model.",
      tier: "fast",
      tags: ["text", "fast"],
    },
    {
      id: "gemini-2.5-pro",
      providerId: "google",
      label: "Gemini 2.5 Pro",
      description: "Quality Gemini model.",
      tier: "quality",
      tags: ["text", "quality"],
    },
    {
      id: "gemini-3-pro",
      providerId: "google",
      label: "Gemini 3 Pro",
      description: "Recent Gemini release.",
      tier: "quality",
      tags: ["text", "quality"],
    },
    {
      id: "imagen-4",
      providerId: "google",
      label: "Imagen 4",
      description: "Gemini Imagen 4 image generation.",
      tier: "quality",
      tags: ["image", "quality"],
    },
    {
      id: "imagen-4-ultra",
      providerId: "google",
      label: "Imagen 4 Ultra",
      description: "Higher quality Imagen 4 variant.",
      tier: "quality",
      tags: ["image", "quality"],
    },
    {
      id: "nano-banana",
      providerId: "google",
      label: "Nano Banana",
      description: "Lightweight image model.",
      tier: "fast",
      tags: ["image", "fast"],
    },
    {
      id: "local-llama-3",
      providerId: "local",
      label: "LLaMA 3 local",
      description: "Example local model for on-premise setups.",
      tier: "local",
      tags: ["text", "local"],
    },
  ],
};

export default aiModelConfig;
