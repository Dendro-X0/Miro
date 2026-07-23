import assert from "node:assert";
import type { AppInstance } from "../src/types";
import { createApp } from "../src/app";

async function createMockApp(): Promise<AppInstance> {
  process.env.MIRO_AI_PROVIDER = "mock";
  process.env.MIRO_ENABLE_AUTH = "false";
  delete process.env.MIRO_AI_API_KEY;
  return createApp();
}

async function testApiChatSuccess(app: AppInstance): Promise<void> {
  const response: Response = await app.request("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Hello" }],
    }),
  });
  assert.strictEqual(response.status, 200);
  const text = await response.text();
  assert.ok(text.length > 0);
  assert.ok(text.includes("mock AI"));
}

async function testAiImageV2Success(app: AppInstance): Promise<void> {
  const response: Response = await app.request("/v2/ai/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "Test image", provider: "mock" }),
  });
  assert.strictEqual(response.status, 200);
  const json = (await response.json()) as { readonly images?: readonly { readonly url?: string }[] };
  assert.ok(json.images && json.images.length > 0);
  assert.ok(typeof json.images[0].url === "string" && json.images[0].url.length > 0);
}

async function testAiImageV2RequiresPrompt(app: AppInstance): Promise<void> {
  const response: Response = await app.request("/v2/ai/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "mock" }),
  });
  assert.strictEqual(response.status, 400);
}

async function testAiConfigIncludesImagePath(app: AppInstance): Promise<void> {
  const response: Response = await app.request("/ai/config");
  assert.strictEqual(response.status, 200);
  const body = (await response.json()) as {
    readonly image?: {
      readonly path?: string;
      readonly providers?: readonly string[];
      readonly deferred?: readonly string[];
    };
  };
  assert.strictEqual(body.image?.path, "api");
  assert.ok(body.image?.providers?.includes("comfyui"));
  assert.ok(!(body.image?.deferred ?? []).includes("comfyui"));
}

async function testAiModelsDiscoveryMock(app: AppInstance): Promise<void> {
  const response: Response = await app.request("/ai/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "mock" }),
  });
  assert.strictEqual(response.status, 200);
  const body = (await response.json()) as {
    readonly provider?: string;
    readonly models?: readonly { readonly id?: string }[];
  };
  assert.strictEqual(body.provider, "mock");
  assert.ok(body.models && body.models.length > 0);
}

async function testLeanHealth(app: AppInstance): Promise<void> {
  const response: Response = await app.request("/health");
  assert.strictEqual(response.status, 200);
  const body = (await response.json()) as { readonly mode: string; readonly auth: boolean };
  assert.strictEqual(body.mode, "lean");
  assert.strictEqual(body.auth, false);
}

async function testAuthRoutesAbsent(app: AppInstance): Promise<void> {
  const response: Response = await app.request("/me");
  assert.strictEqual(response.status, 404);
}

async function main(): Promise<void> {
  const app: AppInstance = await createMockApp();
  await testApiChatSuccess(app);
  await testAiImageV2Success(app);
  await testAiImageV2RequiresPrompt(app);
  await testAiConfigIncludesImagePath(app);
  await testAiModelsDiscoveryMock(app);
  await testLeanHealth(app);
  await testAuthRoutesAbsent(app);
  // eslint-disable-next-line no-console
  console.log("ai-v2.test: OK");
}

void main().catch((error: unknown): void => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
