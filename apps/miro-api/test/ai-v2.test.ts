import assert from "node:assert";
import type { AppInstance } from "../src/app";

async function createMockApp(): Promise<AppInstance> {
  process.env.MIRO_AI_PROVIDER = "mock";
  delete process.env.MIRO_AI_API_KEY;
  const module = await import("../src/app");
  const createApp: () => AppInstance = module.createApp as () => AppInstance;
  const app: AppInstance = createApp();
  return app;
}

async function testAiChatV2Success(app: AppInstance): Promise<void> {
  const body: Readonly<Record<string, unknown>> = {
    messages: [{ role: "user", content: "Hello" }],
  };
  const response: Response = await app.request("/v2/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.strictEqual(response.status, 200);
  const json = (await response.json()) as { readonly completion?: { readonly choices?: readonly unknown[] } };
  assert.ok(json.completion);
  const choices: readonly unknown[] | undefined = json.completion?.choices;
  assert.ok(choices && choices.length > 0);
}

async function testAiChatV2ValidationError(app: AppInstance): Promise<void> {
  const body: Readonly<Record<string, unknown>> = {
    messages: "not-an-array",
  };
  const response: Response = await app.request("/v2/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.strictEqual(response.status, 400);
}

async function testAiImageV2Success(app: AppInstance): Promise<void> {
  const body: Readonly<Record<string, unknown>> = {
    prompt: "Test image",
  };
  const response: Response = await app.request("/v2/ai/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.strictEqual(response.status, 200);
  const json = (await response.json()) as { readonly images?: readonly { readonly url?: string }[] };
  const images: readonly { readonly url?: string }[] | undefined = json.images;
  assert.ok(images && images.length > 0);
  const first = images[0];
  assert.ok(typeof first.url === "string" && first.url.length > 0);
}

async function testAiImageV2ValidationError(app: AppInstance): Promise<void> {
  const body: Readonly<Record<string, unknown>> = {
    bad: "payload",
  };
  const response: Response = await app.request("/v2/ai/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.strictEqual(response.status, 400);
}

async function main(): Promise<void> {
  const app: AppInstance = await createMockApp();
  await testAiChatV2Success(app);
  await testAiChatV2ValidationError(app);
  await testAiImageV2Success(app);
  await testAiImageV2ValidationError(app);
  // eslint-disable-next-line no-console
  console.log("ai-v2.test: OK");
}

void main().catch((error: unknown): void => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
