import type { Db } from "@miro/db";
import type { AppContext, AppInstance, AuthInfo } from "../types";
import type { UserProfile } from "../user-service";
import { getUserProfile } from "../user-service";

interface MeRouteDeps {
  readonly app: AppInstance;
  readonly db: Db;
}

export function registerMeRoutes(deps: MeRouteDeps): void {
  const { app, db } = deps;

  app.get("/me", async (context: AppContext) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const userId: string | undefined = auth?.authenticated ? auth.userId : undefined;
    if (!userId) {
      return context.json({ error: "Unauthorized" } as const, 401);
    }
    const profile: UserProfile | null = await getUserProfile({ db, userId });
    if (!profile) {
      return context.json({ error: "User not found" } as const, 404);
    }
    return context.json({ profile } as const);
  });
}
