import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@miro/db";
import { schema } from "@miro/db";
import type { AppContext, AppInstance, AuthInfo } from "../types";

export interface OrganizationSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly role: string;
}

export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly status: string;
}

interface ActivityEntryInput {
  readonly userId: string;
  readonly orgId?: string | null;
  readonly type: string;
  readonly description?: string | null;
}

interface OrgMembership {
  readonly id: string;
  readonly role: string;
}

interface OrgRouteDeps {
  readonly app: AppInstance;
  readonly db: Db;
}

const DEFAULT_PROJECT_STATUS: string = "active";
const DEFAULT_ORG_ROLE_OWNER: string = "owner";

async function getOrgMembership(params: {
  readonly db: Db;
  readonly userId: string;
  readonly orgId: string;
}): Promise<OrgMembership | null> {
  const rows = await params.db
    .select({ id: schema.organizationMember.id, role: schema.organizationMember.role })
    .from(schema.organizationMember)
    .where(
      and(
        eq(schema.organizationMember.orgId, params.orgId),
        eq(schema.organizationMember.userId, params.userId),
      ),
    )
    .limit(1);
  const membership: OrgMembership | undefined = rows[0];
  if (!membership) {
    return null;
  }
  return membership;
}

async function isUserOrgMember(params: {
  readonly db: Db;
  readonly userId: string;
  readonly orgId: string;
}): Promise<boolean> {
  const membership: OrgMembership | null = await getOrgMembership(params);
  return membership !== null;
}

async function logActivity(params: ActivityEntryInput & { readonly db: Db }): Promise<void> {
  const now: Date = new Date();
  await params.db.insert(schema.activity).values({
    id: randomUUID(),
    userId: params.userId,
    orgId: params.orgId ?? null,
    type: params.type,
    description: params.description ?? null,
    createdAt: now,
  });
}

function createOrgSlug(params: { readonly name: string; readonly id: string }): string {
  const lower: string = params.name.toLowerCase();
  const normalized: string = lower.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const base: string = normalized || "workspace";
  const suffix: string = params.id.slice(0, 8);
  return `${base}-${suffix}`;
}

async function createOrganizationForUser(params: {
  readonly db: Db;
  readonly userId: string;
  readonly name: string;
}): Promise<OrganizationSummary> {
  const id: string = randomUUID();
  const now: Date = new Date();
  const nameValue: string = params.name;
  const slug: string = createOrgSlug({ name: nameValue, id });
  await params.db.insert(schema.organization).values({
    id,
    name: nameValue,
    slug,
    plan: null,
    billingStatus: null,
    createdAt: now,
    updatedAt: now,
  });
  await params.db.insert(schema.organizationMember).values({
    id: randomUUID(),
    orgId: id,
    userId: params.userId,
    role: DEFAULT_ORG_ROLE_OWNER,
    createdAt: now,
  });
  const organization: OrganizationSummary = { id, name: nameValue, slug, role: DEFAULT_ORG_ROLE_OWNER };
  return organization;
}

export function registerOrgRoutes(deps: OrgRouteDeps): void {
  const { app, db } = deps;

  app.get("/orgs", async (context: AppContext) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const userId: string | undefined = auth?.authenticated ? auth.userId : undefined;
    if (!userId) {
      return context.json({ error: "Unauthorized" } as const, 401);
    }
    const rows = await db
      .select({
        id: schema.organization.id,
        name: schema.organization.name,
        slug: schema.organization.slug,
        role: schema.organizationMember.role,
      })
      .from(schema.organizationMember)
      .innerJoin(schema.organization, eq(schema.organizationMember.orgId, schema.organization.id))
      .where(eq(schema.organizationMember.userId, userId));
    const organizations: readonly OrganizationSummary[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      role: row.role,
    }));
    return context.json({ organizations } as const);
  });

  app.post("/orgs", async (context: AppContext) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const userId: string | undefined = auth?.authenticated ? auth.userId : undefined;
    if (!userId) {
      return context.json({ error: "Unauthorized" } as const, 401);
    }
    let rawBody: unknown;
    try {
      rawBody = await context.req.json();
    } catch {
      rawBody = {};
    }
    const body = rawBody as { readonly name?: string };
    const nameRaw: string = (body.name ?? "").trim();
    const name: string = nameRaw || "Personal workspace";
    const organization: OrganizationSummary = await createOrganizationForUser({ db, userId, name });
    await logActivity({
      db,
      userId,
      orgId: organization.id,
      type: "org.created",
      description: `Created organization ${organization.name}`,
    });
    return context.json({ organization } as const, 201);
  });

  app.get("/orgs/:orgId/projects", async (context: AppContext) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const userId: string | undefined = auth?.authenticated ? auth.userId : undefined;
    if (!userId) {
      return context.json({ error: "Unauthorized" } as const, 401);
    }
    const orgId: string = context.req.param("orgId");
    const member: boolean = await isUserOrgMember({ db, userId, orgId });
    if (!member) {
      return context.json({ error: "Forbidden" } as const, 403);
    }
    const rows = await db
      .select({
        id: schema.project.id,
        name: schema.project.name,
        status: schema.project.status,
      })
      .from(schema.project)
      .where(eq(schema.project.orgId, orgId));
    const projects: readonly ProjectSummary[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
    }));
    return context.json({ projects } as const);
  });

  app.post("/orgs/:orgId/projects", async (context: AppContext) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const userId: string | undefined = auth?.authenticated ? auth.userId : undefined;
    if (!userId) {
      return context.json({ error: "Unauthorized" } as const, 401);
    }
    const orgId: string = context.req.param("orgId");
    const member: boolean = await isUserOrgMember({ db, userId, orgId });
    if (!member) {
      return context.json({ error: "Forbidden" } as const, 403);
    }
    let rawBody: unknown;
    try {
      rawBody = await context.req.json();
    } catch {
      return context.json({ error: "Invalid JSON body" } as const, 400);
    }
    const body = rawBody as { readonly name?: string; readonly status?: string };
    const nameRaw: string = (body.name ?? "").trim();
    if (!nameRaw) {
      return context.json({ error: "Project name is required" } as const, 400);
    }
    const statusRaw: string = (body.status ?? DEFAULT_PROJECT_STATUS).trim();
    const status: string = statusRaw || DEFAULT_PROJECT_STATUS;
    const now: Date = new Date();
    const id: string = randomUUID();
    await db.insert(schema.project).values({
      id,
      orgId,
      name: nameRaw,
      status,
      createdAt: now,
      updatedAt: now,
    });
    await logActivity({
      db,
      userId,
      orgId,
      type: "project.created",
      description: `Created project ${nameRaw}`,
    });
    const project: ProjectSummary = { id, name: nameRaw, status };
    return context.json({ project } as const, 201);
  });

  app.patch("/orgs/:orgId/projects/:projectId", async (context: AppContext) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const userId: string | undefined = auth?.authenticated ? auth.userId : undefined;
    if (!userId) {
      return context.json({ error: "Unauthorized" } as const, 401);
    }
    const orgId: string = context.req.param("orgId");
    const projectId: string = context.req.param("projectId");
    const member: boolean = await isUserOrgMember({ db, userId, orgId });
    if (!member) {
      return context.json({ error: "Forbidden" } as const, 403);
    }
    let rawBody: unknown;
    try {
      rawBody = await context.req.json();
    } catch {
      return context.json({ error: "Invalid JSON body" } as const, 400);
    }
    const body = rawBody as { readonly name?: string; readonly status?: string };
    const hasName: boolean = typeof body.name === "string" && body.name.trim().length > 0;
    const hasStatus: boolean = typeof body.status === "string" && body.status.trim().length > 0;
    if (!hasName && !hasStatus) {
      return context.json({ error: "Nothing to update" } as const, 400);
    }
    const updates: { name?: string; status?: string; updatedAt: Date } = { updatedAt: new Date() };
    if (hasName) {
      updates.name = body.name!.trim();
    }
    if (hasStatus) {
      updates.status = body.status!.trim();
    }
    await db
      .update(schema.project)
      .set(updates)
      .where(and(eq(schema.project.id, projectId), eq(schema.project.orgId, orgId)));
    await logActivity({
      db,
      userId,
      orgId,
      type: "project.updated",
      description: `Updated project ${projectId}`,
    });
    return context.json({ ok: true } as const);
  });
}
