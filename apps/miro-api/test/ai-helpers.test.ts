import assert from "node:assert";
import type { AiModelsConfig } from "../src/config";
import type { ChatMessage } from "@miro/ai";
import {
  AI_HISTORY_MESSAGE_LIMIT,
  AI_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW,
  aiRateLimitBuckets,
  isAiRateLimited,
  resolveModelId,
  truncateMessagesForV2,
  type RateLimitContext,
} from "../src/ai-helpers";

function createModels(): AiModelsConfig {
  const models: AiModelsConfig = {
    fast: "fast-model",
    balanced: "balanced-model",
    creative: "creative-model",
  };
  return models;
}

function createMessages(count: number): readonly ChatMessage[] {
  const items: ChatMessage[] = [];
  for (let index: number = 0; index < count; index += 1) {
    items.push({ role: "user", content: `m-${index}` } as ChatMessage);
  }
  return items;
}

function createUserRateLimitContext(userId: string): RateLimitContext {
  const context: RateLimitContext = {
    req: {
      header(name: string): string | undefined {
        if (name.toLowerCase() === "x-forwarded-for") {
          return undefined;
        }
        return undefined;
      },
    },
    get<T>(key: string): T | undefined {
      if (key === "auth") {
        const auth = { authenticated: true, userId };
        return auth as unknown as T;
      }
      return undefined;
    },
  };
  return context;
}

async function main(): Promise<void> {
  const models: AiModelsConfig = createModels();

  // Model resolution
  assert.strictEqual(resolveModelId(undefined, models), models.balanced);
  assert.strictEqual(resolveModelId("balanced", models), models.balanced);
  assert.strictEqual(resolveModelId("fast", models), models.fast);
  assert.strictEqual(resolveModelId("creative", models), models.creative);
  assert.strictEqual(resolveModelId("custom-model", models), "custom-model");

  // Message truncation
  const fewMessages: readonly ChatMessage[] = createMessages(AI_HISTORY_MESSAGE_LIMIT - 1);
  const truncatedFew: readonly ChatMessage[] = truncateMessagesForV2(fewMessages);
  assert.strictEqual(truncatedFew.length, fewMessages.length);
  assert.strictEqual(truncatedFew[0], fewMessages[0]);

  const manyMessages: readonly ChatMessage[] = createMessages(AI_HISTORY_MESSAGE_LIMIT + 10);
  const truncatedMany: readonly ChatMessage[] = truncateMessagesForV2(manyMessages);
  assert.strictEqual(truncatedMany.length, AI_HISTORY_MESSAGE_LIMIT);
  const expectedStartIndex: number = manyMessages.length - AI_HISTORY_MESSAGE_LIMIT;
  assert.strictEqual(truncatedMany[0], manyMessages[expectedStartIndex]);

  // Rate limiting
  aiRateLimitBuckets.clear();
  const context: RateLimitContext = createUserRateLimitContext("user-1");
  for (let index: number = 0; index < AI_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW; index += 1) {
    const limited: boolean = isAiRateLimited(context);
    assert.strictEqual(limited, false);
  }
  const limitedAfter: boolean = isAiRateLimited(context);
  assert.strictEqual(limitedAfter, true);

  // eslint-disable-next-line no-console
  console.log("ai-helpers.test: OK");
}

void main().catch((error: unknown): void => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
