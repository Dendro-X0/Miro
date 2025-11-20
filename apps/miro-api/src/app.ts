import type { Context, Next } from "hono";
import { Hono as HonoApp } from "hono";
import type { Db } from "@miro/db";
import getDb, { schema } from "@miro/db";
import type { AiClient, AiImageClient } from "@miro/ai";
import type { AuthInstance } from "@miro/auth";
import createAuthServer from "@miro/auth";
import type { ApiConfig } from "./config";
import { getApiConfig } from "./config";
import type { AppBindings, AppInstance, AuthInfo } from "./types";
import { registerHealthRoutes } from "./routes/health";
import { registerAuthRoutes } from "./routes/auth";
import { registerMeRoutes } from "./routes/me";
import { registerAiRoutes, createAiClientFromConfig, createImageClientFromConfig } from "./routes/ai";
import { registerOrgRoutes } from "./routes/orgs";
import { registerActivityRoutes } from "./routes/activity";

const apiConfig: ApiConfig = getApiConfig();
const db: Db = getDb();
const aiClient: AiClient = createAiClientFromConfig(apiConfig);
const imageClient: AiImageClient = createImageClientFromConfig(apiConfig);

const authServer: AuthInstance = createAuthServer({
  appName: "Miro",
  baseUrl: apiConfig.authBaseUrl,
  db,
  schema,
});

interface BetterAuthSessionResult {
  readonly session?: {
    readonly userId?: string;
  };
  readonly user?: {
    readonly id?: string;
    readonly email?: string;
    readonly name?: string;
    readonly username?: string | null;
    readonly displayUsername?: string | null;
    readonly twoFactorEnabled?: boolean | null;
    readonly onboardingComplete?: boolean | null;
  };
}

async function fetchAuthFromSession(headers: Headers): Promise<AuthInfo | undefined> {
  try {
    const result: BetterAuthSessionResult | null = (await authServer.api.getSession({ headers })) as
      | BetterAuthSessionResult
      | null;
    if (!result) {
      return undefined;
    }
    const userIdFromUser: string | undefined = result.user?.id;
    const userIdFromSession: string | undefined = result.session?.userId;
    const userId: string | undefined = userIdFromUser ?? userIdFromSession;
    if (!userId) {
      return { authenticated: false };
    }
    return { authenticated: true, userId };
  } catch {
    return undefined;
  }
}

function deriveAuthFromHeaders(request: Request): AuthInfo {
  const bearer: string | undefined = request.headers.get("authorization") ?? undefined;
  const headerUserId: string | undefined = request.headers.get("x-user-id") ?? undefined;
  const userId: string | undefined = headerUserId ?? (bearer?.startsWith("Bearer ") ? bearer.slice(7).trim() : undefined);
  if (!userId) {
    return { authenticated: false };
  }
  return { authenticated: true, userId };
}

export function createApp(): AppInstance {
  const app: AppInstance = new HonoApp<AppBindings>();

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

  registerHealthRoutes({ app, db });
  registerAuthRoutes({ app, db });
  registerMeRoutes({ app, db });
  registerAiRoutes({ app, apiConfig, aiClient, imageClient });
  registerOrgRoutes({ app, db });
  registerActivityRoutes({ app, db });

  return app;
}
