import type { ChatMessage } from "@miro/ai";
import type { AiModelsConfig } from "./config";

export const AI_HISTORY_MESSAGE_LIMIT: number = 32;
export const AI_RATE_LIMIT_WINDOW_MS: number = 60_000;
export const AI_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW: number = 60;

export interface AiRateLimitBucket {
  readonly count: number;
  readonly resetAt: number;
}

export const aiRateLimitBuckets: Map<string, AiRateLimitBucket> = new Map();

export interface RateLimitAuthInfo {
  readonly authenticated: boolean;
  readonly userId?: string;
}

export interface RateLimitRequest {
  header(name: string): string | undefined;
}

export interface RateLimitContext {
  readonly req: RateLimitRequest;
  get<T>(key: string): T | undefined;
}

export function resolveModelId(rawModel: string | undefined, models: AiModelsConfig): string {
  const raw: string = rawModel?.trim() ?? "";
  if (raw.length === 0 || raw === "balanced") {
    return models.balanced;
  }
  if (raw === "fast") {
    return models.fast;
  }
  if (raw === "creative") {
    return models.creative;
  }
  return raw;
}

export function truncateMessagesForV2(messages: readonly ChatMessage[]): readonly ChatMessage[] {
  if (messages.length <= AI_HISTORY_MESSAGE_LIMIT) {
    return messages;
  }
  const startIndex: number = messages.length - AI_HISTORY_MESSAGE_LIMIT;
  return messages.slice(startIndex);
}

export function getAiRateLimitKey(context: RateLimitContext): string {
  const auth: RateLimitAuthInfo | undefined = context.get<RateLimitAuthInfo | undefined>("auth");
  const userId: string | undefined = auth && auth.authenticated ? auth.userId : undefined;
  if (userId) {
    return `user:${userId}`;
  }
  const forwardedFor: string | undefined = context.req.header("x-forwarded-for") ?? undefined;
  if (forwardedFor && forwardedFor.length > 0) {
    return `ip:${forwardedFor}`;
  }
  return "anonymous";
}

export function checkAndConsumeAiRateLimit(key: string, now: number): boolean {
  const existing: AiRateLimitBucket | undefined = aiRateLimitBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const bucket: AiRateLimitBucket = { count: 1, resetAt: now + AI_RATE_LIMIT_WINDOW_MS };
    aiRateLimitBuckets.set(key, bucket);
    return false;
  }
  if (existing.count >= AI_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  const bucket: AiRateLimitBucket = { count: existing.count + 1, resetAt: existing.resetAt };
  aiRateLimitBuckets.set(key, bucket);
  return false;
}

export function isAiRateLimited(context: RateLimitContext): boolean {
  const key: string = getAiRateLimitKey(context);
  const now: number = Date.now();
  return checkAndConsumeAiRateLimit(key, now);
}
