import assert from "node:assert";
import { listModels } from "../src/list-models";

const originalFetch = globalThis.fetch;

function mockFetch(handler: (url: string) => Response): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url);
  }) as typeof fetch;
}

try {
  mockFetch((url) => {
    if (url.endsWith("/models")) {
      return new Response(
        JSON.stringify({
          data: [
            { id: "gpt-5.6-sol" },
            { id: "text-embedding-3-small" },
            { id: "dall-e-4" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("not found", { status: 404 });
  });

  const openAiModels = await listModels({
    provider: "openai-compatible",
    apiKey: "sk-test",
    baseUrl: "https://example.test/v1",
  });
  assert.ok(openAiModels.some((model) => model.id === "gpt-5.6-sol"));
  assert.ok(!openAiModels.some((model) => model.id.includes("embed")));
  assert.ok(openAiModels.some((model) => model.kind === "image"));

  mockFetch((url) => {
    if (url.endsWith("/api/tags")) {
      return new Response(
        JSON.stringify({
          models: [{ name: "llama3.3" }, { name: "mistral-nemo" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("not found", { status: 404 });
  });

  const localModels = await listModels({
    provider: "local",
    apiKey: "",
    baseUrl: "http://localhost:11434/v1",
  });
  assert.strictEqual(localModels.length, 2);
  assert.strictEqual(localModels[0]?.tags.includes("local"), true);
} finally {
  globalThis.fetch = originalFetch;
}

// eslint-disable-next-line no-console
console.log("list-models.test: OK");
