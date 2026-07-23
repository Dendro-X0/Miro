/** Provider ids used by env config and the settings UI. */
export type AiProviderId =
  | "mock"
  | "openai"
  | "openai-compatible"
  | "anthropic"
  | "google"
  | "local"
  | "comfyui";

export function normalizeProviderId(provider: string): AiProviderId {
  const trimmed = provider.trim().toLowerCase();
  if (trimmed === "openai-compatible" || trimmed === "openai") {
    return trimmed === "openai" ? "openai" : "openai-compatible";
  }
  if (trimmed === "google" || trimmed === "gemini") {
    return "google";
  }
  if (trimmed === "local" || trimmed === "ollama") {
    return "local";
  }
  if (trimmed === "comfyui" || trimmed === "comfy") {
    return "comfyui";
  }
  if (trimmed === "anthropic") {
    return "anthropic";
  }
  if (trimmed === "mock") {
    return "mock";
  }
  return "mock";
}

/** Providers supported for text streaming in the v1 golden path. */
export const GOLDEN_PATH_PROVIDERS: readonly AiProviderId[] = [
  "mock",
  "openai",
  "openai-compatible",
  "google",
  "anthropic",
  "local",
] as const;
