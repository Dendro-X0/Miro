import { desc, eq } from "drizzle-orm";
import type { Db } from "@miro/db";
import { schema } from "@miro/db";
import type { AppContext, AppInstance, AuthInfo } from "../types";

interface ActivityRouteDeps {
  readonly app: AppInstance;
  readonly db: Db;
}

interface ActivityEntry {
  readonly id: string;
  readonly type: string;
  readonly description?: string | null;
  readonly createdAt: Date;
  readonly orgName?: string | null;
}

const ACTIVITY_LIMIT: number = 10;

export function registerActivityRoutes(deps: ActivityRouteDeps): void {
  const { app, db } = deps;

  app.get("/activity", async (context: AppContext) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const userId: string | undefined = auth?.authenticated ? auth.userId : undefined;
    if (!userId) {
      return context.json({ error: "Unauthorized" } as const, 401);
    }
    const rows: readonly ActivityEntry[] = await db
      .select({
        id: schema.activity.id,
        type: schema.activity.type,
        description: schema.activity.description,
        createdAt: schema.activity.createdAt,
        orgName: schema.organization.name,
      })
      .from(schema.activity)
      .leftJoin(schema.organization, eq(schema.activity.orgId, schema.organization.id))
      .where(eq(schema.activity.userId, userId))
      .orderBy(desc(schema.activity.createdAt))
      .limit(ACTIVITY_LIMIT);
    return context.json({ activity: rows } as const);
  });
}
