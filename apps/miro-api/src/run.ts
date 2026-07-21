import { serve } from "@hono/node-server";
import type { AppInstance } from "./types";
import { createApp } from "./app";
import { getApiConfig } from "./config";

const config = getApiConfig();
const port: number = config.port;
const app: AppInstance = await createApp();

serve({
  fetch: app.fetch,
  port,
});

const mode: string = config.enableAuth ? "full (auth+db)" : "lean (AI only)";
// eslint-disable-next-line no-console
console.log(`Miro API listening on http://localhost:${port} [${mode}]`);
