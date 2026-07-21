import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { getApiConfig } from "./config";
import type { AppInstance } from "./types";

process.env.MIRO_ENABLE_AUTH ??= "false";

async function main(): Promise<void> {
  const config = getApiConfig();
  const port = config.port;
  const app: AppInstance = await createApp();

  serve({
    fetch: app.fetch,
    port,
  });

  const mode = config.enableAuth ? "full (auth+db)" : "lean (AI only)";
  // eslint-disable-next-line no-console
  console.log(`Miro API listening on http://localhost:${port} [${mode}]`);
}

void main();
