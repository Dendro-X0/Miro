import type { Db } from "@miro/db";
import type { AppContext, AppInstance, AuthInfo } from "../types";
import type { UserProfile } from "../user-service";
import { getUserProfile } from "../user-service";

interface AuthRouteDeps {
  readonly app: AppInstance;
  readonly db: Db;
}

export function registerAuthRoutes(deps: AuthRouteDeps): void {
  const { app, db } = deps;

  app.get("/auth/whoami", (context: AppContext) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const authenticated: boolean = auth?.authenticated ?? false;
    const userId: string | undefined = auth?.userId;
    return context.json({ authenticated, userId } as const);
  });

  app.get("/auth/session", async (context: AppContext) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const authenticated: boolean = auth?.authenticated ?? false;
    const userId: string | undefined = auth?.userId;
    if (!authenticated || !userId) {
      return context.json({ authenticated: false, userId: undefined, profile: null } as const);
    }
    const profile: UserProfile | null = await getUserProfile({ db, userId });
    return context.json({ authenticated, userId, profile } as const);
  });
}
