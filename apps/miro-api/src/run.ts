import { serve } from "@hono/node-server";
import type { AppInstance } from "./app";
import { createApp } from "./app";
import { getApiConfig } from "./config";

const config = getApiConfig();
const port: number = config.port;
const app: AppInstance = createApp();

serve({
  fetch: app.fetch,
  port,
});

// eslint-disable-next-line no-console
console.log(`Miro API listening on http://localhost:${port}`);
