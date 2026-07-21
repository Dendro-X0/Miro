import assert from "node:assert";
import type { ApiConfig } from "../src/config";
import { getApiConfig } from "../src/config";

async function withEnv(env: Record<string, string | undefined>, fn: () => Promise<void>): Promise<void> {
  const original: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    const current: string | undefined = process.env[key];
    original[key] = current;
    const value: string | undefined = env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    await fn();
  } finally {
    for (const key of Object.keys(original)) {
      const value: string | undefined = original[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function main(): Promise<void> {
  await withEnv({ MIRO_AI_PROVIDER: "openai", MIRO_AI_API_KEY: undefined }, async () => {
    let threw: boolean = false;
    try {
      getApiConfig();
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true);
  });

  await withEnv({ MIRO_AI_PROVIDER: "openai", MIRO_AI_API_KEY: "test-key" }, async () => {
    const config: ApiConfig = getApiConfig();
    assert.strictEqual(config.ai.provider, "openai");
    assert.strictEqual(config.ai.apiKey, "test-key");
  });

  await withEnv({ MIRO_AI_PROVIDER: "local", MIRO_AI_API_KEY: undefined }, async () => {
    const config: ApiConfig = getApiConfig();
    assert.strictEqual(config.ai.provider, "local");
    assert.strictEqual(config.ai.apiKey, null);
    assert.ok(config.ai.baseUrl.includes("11434"));
  });

  await withEnv({ MIRO_AI_PROVIDER: "local", MIRO_AI_API_KEY: "local-key" }, async () => {
    const config: ApiConfig = getApiConfig();
    assert.strictEqual(config.ai.provider, "local");
    assert.strictEqual(config.ai.apiKey, "local-key");
  });

  await withEnv({ MIRO_AI_PROVIDER: "openai-compatible", MIRO_AI_API_KEY: "sk-test" }, async () => {
    const config: ApiConfig = getApiConfig();
    assert.strictEqual(config.ai.provider, "openai-compatible");
    assert.strictEqual(config.ai.apiKey, "sk-test");
  });

  await withEnv({ MIRO_AI_PROVIDER: "anthropic", MIRO_AI_API_KEY: undefined }, async () => {
    const config: ApiConfig = getApiConfig();
    assert.strictEqual(config.ai.provider, "anthropic");
    assert.strictEqual(config.ai.apiKey, null);
  });

  await withEnv({ MIRO_AI_PROVIDER: undefined, MIRO_AI_API_KEY: undefined }, async () => {
    const config: ApiConfig = getApiConfig();
    assert.strictEqual(config.ai.provider, "mock");
    assert.strictEqual(config.enableAuth, false);
  });

  await withEnv({ MIRO_ENABLE_AUTH: "true", MIRO_AI_PROVIDER: "mock" }, async () => {
    const config: ApiConfig = getApiConfig();
    assert.strictEqual(config.enableAuth, true);
  });

  await withEnv({ MIRO_ENABLE_AUTH: "false", MIRO_AI_PROVIDER: "mock" }, async () => {
    const config: ApiConfig = getApiConfig();
    assert.strictEqual(config.enableAuth, false);
  });

  // eslint-disable-next-line no-console
  console.log("ai-config.test: OK");
}

void main().catch((error: unknown): void => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
