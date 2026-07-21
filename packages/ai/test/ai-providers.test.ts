import assert from "node:assert";
import {
  createAiImageClient,
  createMockAiImageClient,
  createModel,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OPENAI_BASE_URL,
  normalizeProviderId,
} from "../src/index";

assert.strictEqual(normalizeProviderId("openai-compatible"), "openai-compatible");
assert.strictEqual(normalizeProviderId("openai"), "openai");
assert.strictEqual(normalizeProviderId("ollama"), "local");
assert.strictEqual(normalizeProviderId("local"), "local");
assert.strictEqual(normalizeProviderId("google"), "google");
assert.strictEqual(normalizeProviderId("anthropic"), "anthropic");

const mock = createModel({ provider: "mock", apiKey: "", modelId: "mock" });
assert.ok(mock);

const ollama = createModel({
  provider: "local",
  apiKey: "",
  modelId: "llama3.2",
  baseUrl: DEFAULT_OLLAMA_BASE_URL,
});
assert.ok(ollama);

const openai = createModel({
  provider: "openai-compatible",
  apiKey: "sk-test",
  modelId: "gpt-4o-mini",
  baseUrl: DEFAULT_OPENAI_BASE_URL,
});
assert.ok(openai);

const anthropic = createModel({
  provider: "anthropic",
  apiKey: "sk-ant-test",
  modelId: "claude-3-7-sonnet",
});
assert.ok(anthropic);

let threw = false;
try {
  createModel({ provider: "openai-compatible", apiKey: "", modelId: "gpt-4o-mini" });
} catch {
  threw = true;
}
assert.strictEqual(threw, true);

const mockImages = createMockAiImageClient();
const mockResult = await mockImages.generateImages({
  model: "mock",
  prompt: "a blue cube",
});
assert.strictEqual(mockResult.length, 1);
assert.ok(mockResult[0].url.includes("placehold.co"));

const factoryMock = createAiImageClient({ provider: "mock", apiKey: "" });
const factoryResult = await factoryMock.generateImages({ model: "mock", prompt: "test" });
assert.ok(factoryResult[0].url.length > 0);

let localImageThrew = false;
try {
  createAiImageClient({ provider: "local", apiKey: "" });
} catch {
  localImageThrew = true;
}
assert.strictEqual(localImageThrew, true);

const originalFetch = globalThis.fetch;
globalThis.fetch = (async () =>
  new Response(
    JSON.stringify({
      data: [{ b64_json: Buffer.from("fake-png").toString("base64") }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )) as typeof fetch;

try {
  const client = createAiImageClient({
    provider: "openai-compatible",
    apiKey: "sk-test",
    baseUrl: "https://example.test/v1",
  });
  const images = await client.generateImages({
    model: "dall-e-3",
    prompt: "a red sphere",
  });
  assert.strictEqual(images.length, 1);
  assert.ok(images[0].url.startsWith("data:image/png;base64,"));
} finally {
  globalThis.fetch = originalFetch;
}

// eslint-disable-next-line no-console
console.log("ai-providers.test: OK");
