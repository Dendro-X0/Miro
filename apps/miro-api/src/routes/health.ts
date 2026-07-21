import type { Db } from "@miro/db";
import type { AppContext, AppInstance } from "../types";

interface HealthRouteDeps {
  readonly app: AppInstance;
  readonly db: Db | null;
  readonly enableAuth: boolean;
}

export function registerHealthRoutes(params: HealthRouteDeps): void {
  const { app, db, enableAuth } = params;
  app.get("/health", (context: AppContext) => {
    return context.json({
      ok: true,
      mode: enableAuth ? "full" : "lean",
      auth: enableAuth,
      db: db !== null,
    } as const);
  });
}
