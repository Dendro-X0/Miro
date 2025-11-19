import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import getDb, { schema, type Db } from "./index";

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const DEMO_USER_EMAIL: string = "demo@miro.local";
const DEMO_USER_NAME: string = "Demo User";
const DEMO_ORG_NAME: string = "Personal workspace";
const DEMO_ORG_ROLE_OWNER: string = "owner";
const DEFAULT_PROJECT_STATUS: string = "active";

async function ensureDemoUser(db: Db): Promise<string> {
  const existing = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, DEMO_USER_EMAIL))
    .limit(1);
  const existingId: string | undefined = existing[0]?.id;
  if (existingId) {
    return existingId;
  }
  const id: string = randomUUID();
  await db.insert(schema.user).values({
    id,
    name: DEMO_USER_NAME,
    email: DEMO_USER_EMAIL,
  });
  return id;
}

function createOrgSlug(name: string, id: string): string {
  const lower: string = name.toLowerCase();
  const normalized: string = lower.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const base: string = normalized || "workspace";
  const suffix: string = id.slice(0, 8);
  return `${base}-${suffix}`;
}

async function ensureDemoOrganization(db: Db, userId: string): Promise<string> {
  const existing = await db
    .select({ orgId: schema.organizationMember.orgId })
    .from(schema.organizationMember)
    .where(eq(schema.organizationMember.userId, userId))
    .limit(1);
  const existingOrgId: string | undefined = existing[0]?.orgId;
  if (existingOrgId) {
    return existingOrgId;
  }
  const id: string = randomUUID();
  const slug: string = createOrgSlug(DEMO_ORG_NAME, id);
  await db.insert(schema.organization).values({
    id,
    name: DEMO_ORG_NAME,
    slug,
    plan: "free",
    billingStatus: "active",
  });
  await db.insert(schema.organizationMember).values({
    id: randomUUID(),
    orgId: id,
    userId,
    role: DEMO_ORG_ROLE_OWNER,
  });
  return id;
}

async function seedDemoProjects(db: Db, orgId: string, userId: string): Promise<void> {
  const existing = await db
    .select({ id: schema.project.id })
    .from(schema.project)
    .where(eq(schema.project.orgId, orgId))
    .limit(1);
  if (existing[0]) {
    return;
  }
  const now: Date = new Date();
  const templates: readonly { readonly name: string; readonly status: string }[] = [
    { name: "Onboarding flow", status: DEFAULT_PROJECT_STATUS },
    { name: "Billing integration", status: "planned" },
    { name: "Analytics dashboard", status: "paused" },
  ];
  const projects = templates.map((template) => ({
    id: randomUUID(),
    orgId,
    name: template.name,
    status: template.status,
    createdAt: now,
    updatedAt: now,
  }));
  await db.insert(schema.project).values(projects);

  const activityRows = projects.map((project) => ({
    id: randomUUID(),
    userId,
    orgId,
    type: "project.created",
    description: `Created project ${project.name}`,
    createdAt: now,
  }));
  await db.insert(schema.activity).values(activityRows);
}

async function runSeed(): Promise<void> {
  const db: Db = getDb();
  const userId: string = await ensureDemoUser(db);
  const orgId: string = await ensureDemoOrganization(db, userId);
  await seedDemoProjects(db, orgId, userId);
}

void runSeed().then(() => {
  // eslint-disable-next-line no-console
  console.log("Miro DB seed completed.");
});
