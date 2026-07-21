import type { Context, Next } from "hono";
import { Hono as HonoApp } from "hono";
import { cors } from "hono/cors";
import type { Db } from "@miro/db";
import type { AuthInstance } from "@miro/auth";
import type { ApiConfig } from "./config";
import { getApiConfig } from "./config";
import type { AppBindings, AppInstance, AuthInfo } from "./types";
import { registerHealthRoutes } from "./routes/health";
import { registerAiRoutes, createImageClientFromConfig } from "./routes/ai";

interface BetterAuthSessionResult {
  readonly session?: {
    readonly userId?: string;
  };
  readonly user?: {
    readonly id?: string;
  };
}

function deriveAuthFromHeaders(request: Request): AuthInfo {
  const bearer: string | undefined = request.headers.get("authorization") ?? undefined;
  const headerUserId: string | undefined = request.headers.get("x-user-id") ?? undefined;
  const userId: string | undefined =
    headerUserId ?? (bearer?.startsWith("Bearer ") ? bearer.slice(7).trim() : undefined);
  if (!userId) {
    return { authenticated: false };
  }
  return { authenticated: true, userId };
}

function createLeanApp(config: ApiConfig): AppInstance {
  const app: AppInstance = new HonoApp<AppBindings>();
  const imageClient = createImageClientFromConfig(config);

  app.use("/*", cors());
  app.use("/*", async (context: Context<AppBindings>, next: Next): Promise<void> => {
    context.set("auth", { authenticated: false });
    await next();
  });

  registerHealthRoutes({ app, db: null, enableAuth: false });
  registerAiRoutes({ app, apiConfig: config, imageClient });
  return app;
}

async function createFullApp(config: ApiConfig): Promise<AppInstance> {
  const [{ default: getDb, schema }, { default: createAuthServer }] = await Promise.all([
    import("@miro/db"),
    import("@miro/auth"),
  ]);
  const [
    { registerAuthRoutes },
    { registerMeRoutes },
    { registerOrgRoutes },
    { registerActivityRoutes },
  ] = await Promise.all([
    import("./routes/auth"),
    import("./routes/me"),
    import("./routes/orgs"),
    import("./routes/activity"),
  ]);

  const db: Db = getDb();
  const authServer: AuthInstance = createAuthServer({
    appName: "Miro",
    baseUrl: config.authBaseUrl,
    db,
    schema,
  });
  const imageClient = createImageClientFromConfig(config);

  async function fetchAuthFromSession(headers: Headers): Promise<AuthInfo | undefined> {
    try {
      const result: BetterAuthSessionResult | null = (await authServer.api.getSession({
        headers,
      })) as BetterAuthSessionResult | null;
      if (!result) {
        return undefined;
      }
      const userId: string | undefined = result.user?.id ?? result.session?.userId;
      if (!userId) {
        return { authenticated: false };
      }
      return { authenticated: true, userId };
    } catch {
      return undefined;
    }
  }

  const app: AppInstance = new HonoApp<AppBindings>();
  app.use("/*", cors());
  app.use("/*", async (context: Context<AppBindings>, next: Next): Promise<void> => {
    const headers: Headers = new Headers();
    const cookie: string | undefined = context.req.header("cookie") ?? undefined;
    if (cookie) {
      headers.set("cookie", cookie);
    }
    const authorization: string | undefined = context.req.header("authorization") ?? undefined;
    if (authorization) {
      headers.set("authorization", authorization);
    }
    const sessionAuth: AuthInfo | undefined = await fetchAuthFromSession(headers);
    const auth: AuthInfo = sessionAuth ?? deriveAuthFromHeaders(context.req.raw);
    context.set("auth", auth);
    await next();
  });

  registerHealthRoutes({ app, db, enableAuth: true });
  registerAuthRoutes({ app, db });
  registerMeRoutes({ app, db });
  registerAiRoutes({ app, apiConfig: config, imageClient });
  registerOrgRoutes({ app, db });
  registerActivityRoutes({ app, db });
  return app;
}

/**
 * Create the API app.
 * - Lean (default, `MIRO_ENABLE_AUTH` unset/false): AI + health only; no Postgres/Better Auth load.
 * - Full (`MIRO_ENABLE_AUTH=true`): dynamically loads `@miro/db`, `@miro/auth`, and multi-user routes.
 */
export async function createApp(): Promise<AppInstance> {
  const config: ApiConfig = getApiConfig();
  if (!config.enableAuth) {
    return createLeanApp(config);
  }
  return createFullApp(config);
}

/** Sync lean app for AI-only tests. Requires auth disabled. */
export function createLeanAppSync(): AppInstance {
  const config: ApiConfig = getApiConfig();
  if (config.enableAuth) {
    throw new Error("createLeanAppSync() requires MIRO_ENABLE_AUTH to be unset/false");
  }
  return createLeanApp(config);
}
