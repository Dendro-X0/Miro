import type { Db } from "@miro/db";
import type { AppContext, AppInstance } from "../types";

interface HealthRouteDeps {
  readonly app: AppInstance;
  readonly db: Db;
}

export function registerHealthRoutes(params: HealthRouteDeps): void {
  const { app, db } = params;
  app.get("/health", (context: AppContext) => {
    const ok: boolean = Boolean(db);
    return context.json({ ok } as const);
  });
}
