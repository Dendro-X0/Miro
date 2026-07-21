import { test } from "node:test";
import assert from "node:assert";
import { createApp } from "../src/app";

async function withEnv(
  env: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const original: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    original[key] = process.env[key];
    if (env[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  }
  try {
    await fn();
  } finally {
    for (const key of Object.keys(original)) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key]!;
      }
    }
  }
}

test("POST /api/chat with mock provider returns streaming response", async () => {
  await withEnv(
    { MIRO_AI_PROVIDER: "mock", MIRO_AI_API_KEY: "mock-key", MIRO_ENABLE_AUTH: undefined },
    async () => {
      const app = await createApp();

      const response = await app.request("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          model: "mock-model",
        }),
      });

      assert.strictEqual(response.status, 200, "Response status should be 200");
      assert.ok(response.body, "Response should have a body");

      const text = await response.text();
      assert.ok(text.length > 0, "Response body should not be empty");
      assert.ok(text.includes("mock AI"), "Response should contain mock content");
    },
  );
});

test("GET /health reports lean mode when auth is disabled", async () => {
  await withEnv({ MIRO_ENABLE_AUTH: undefined, MIRO_AI_PROVIDER: "mock" }, async () => {
    const app = await createApp();
    const response = await app.request("/health");
    assert.strictEqual(response.status, 200);
    const body = (await response.json()) as {
      readonly ok: boolean;
      readonly mode: string;
      readonly auth: boolean;
      readonly db: boolean;
    };
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.mode, "lean");
    assert.strictEqual(body.auth, false);
    assert.strictEqual(body.db, false);
  });
});
