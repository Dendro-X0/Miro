import { createHash } from "node:crypto";

import type { DiscoveredModel } from "@miro/ai";

interface CacheEntry {
  readonly expiresAt: number;
  readonly models: readonly DiscoveredModel[];
}

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

export function buildModelCacheKey(
  provider: string,
  baseUrl: string | undefined,
  apiKey: string,
): string {
  const hash = createHash("sha256")
    .update(`${provider}|${baseUrl ?? ""}|${apiKey}`)
    .digest("hex")
    .slice(0, 24);
  return hash;
}

export function getCachedModels(key: string): readonly DiscoveredModel[] | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.models;
}

export function setCachedModels(key: string, models: readonly DiscoveredModel[]): void {
  cache.set(key, {
    expiresAt: Date.now() + TTL_MS,
    models,
  });
}

export function clearModelCache(): void {
  cache.clear();
}
