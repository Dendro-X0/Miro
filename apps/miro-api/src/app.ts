import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import type { Context, Hono, Next } from "hono";
import { Hono as HonoApp } from "hono";
import type { Db } from "@miro/db";
import getDb, { schema } from "@miro/db";
import type {
	AiClient,
	AiCompletionParams,
	AiCompletionResult,
	ChatCompletionInput,
	ChatCompletionResponse,
	ChatMessage,
	OpenAiClientConfig,
	AiImageClient,
	AiImageParams,
	AiImageResult,
} from "@miro/ai";
import { createMockAiClient, createMockAiImageClient, createOpenAiAiClient, createOpenAiImageClient } from "@miro/ai";
import type { AuthInstance } from "@miro/auth";
import createAuthServer from "@miro/auth";
import type { AiConfig, ApiConfig } from "./config";
import { getApiConfig } from "./config";
import { isAiRateLimited, resolveModelId, truncateMessagesForV2 } from "./ai-helpers";

export interface AuthInfo {
  readonly authenticated: boolean;
  readonly userId?: string;
}

export type AppBindings = {
  readonly Bindings: Record<string, never>;
  readonly Variables: {
    auth?: AuthInfo;
  };
};

export type AppInstance = Hono<AppBindings>;

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

export interface UserProfile {
	readonly id: string;
	readonly email: string;
	readonly name: string;
	readonly username?: string | null;
	readonly displayUsername?: string | null;
	readonly twoFactorEnabled?: boolean | null;
	readonly onboardingComplete?: boolean | null;
}

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

interface ActivityEntry {
	readonly id: string;
	readonly type: string;
	readonly description?: string | null;
	readonly createdAt: Date;
	readonly orgName?: string | null;
}

interface OrgMembership {
	readonly id: string;
	readonly role: string;
}

interface LogActivityInput {
	readonly userId: string;
	readonly orgId?: string | null;
	readonly type: string;
	readonly description?: string | null;
}

const DEFAULT_PROJECT_STATUS: string = "active";
const DEFAULT_ORG_ROLE_OWNER: string = "owner";
const ACTIVITY_LIMIT: number = 10;
const DEFAULT_IMAGE_MODEL: string = process.env.MIRO_AI_IMAGE_MODEL?.trim() ?? "gpt-image-1";

interface AiCompleteRequestBody {
  readonly prompt: string;
  readonly model?: string;
}

interface AiCompleteResponseBody {
  readonly text: string;
}

function isAiCompleteRequestBody(value: unknown): value is AiCompleteRequestBody {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record: Record<string, unknown> = value as Record<string, unknown>;
  if (typeof record.prompt !== "string") {
    return false;
  }
  if ("model" in record && typeof record.model !== "string") {
    return false;
  }
  return true;
}

async function handleAiComplete(context: Context<AppBindings>): Promise<Response> {
  const rawBody: unknown = await context.req.json();
  if (!isAiCompleteRequestBody(rawBody)) {
    return context.json({ error: "Invalid request body" } as const, 400);
  }
  const requestBody: AiCompleteRequestBody = rawBody;
  const params: AiCompletionParams = {
    model: requestBody.model ?? "mock-model",
    prompt: requestBody.prompt,
  };
  const result: AiCompletionResult = await aiClient.generateCompletion(params);
  const responseBody: AiCompleteResponseBody = { text: result.text };
  return context.json(responseBody);
}

interface AiChatRequestBody {
  readonly messages: readonly ChatMessage[];
  readonly model?: string;
}

interface AiChatResponseBody {
  readonly completion: ChatCompletionResponse;
}

function isAiChatRequestBody(value: unknown): value is AiChatRequestBody {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record: Record<string, unknown> = value as Record<string, unknown>;
  if (!Array.isArray(record.messages)) {
    return false;
  }
  for (const item of record.messages) {
    if (item === null || typeof item !== "object") {
      return false;
    }
    const messageRecord: Record<string, unknown> = item as Record<string, unknown>;
    if (typeof messageRecord.role !== "string") {
      return false;
    }
  }
  if ("model" in record && typeof record.model !== "string") {
    return false;
  }
  return true;
}

async function handleAiChat(context: Context<AppBindings>): Promise<Response> {
  const rawBody: unknown = await context.req.json();
  if (!isAiChatRequestBody(rawBody)) {
    return context.json({ error: "Invalid request body" } as const, 400);
  }
  const requestBody: AiChatRequestBody = rawBody;
  const input: ChatCompletionInput = {
    model: requestBody.model ?? "mock-model",
    messages: requestBody.messages,
  };
  const completion: ChatCompletionResponse = await aiClient.provider.createChatCompletion(input);
  const responseBody: AiChatResponseBody = { completion };
  return context.json(responseBody);
}

async function handleAiCompleteV2(context: Context<AppBindings>): Promise<Response> {
	if (isAiRateLimited(context)) {
		return context.json({ error: "Rate limit exceeded" } as const, 429);
	}
	let rawBody: unknown;
	try {
		rawBody = await context.req.json();
	} catch {
		return context.json({ error: "Invalid JSON body" } as const, 400);
	}
	if (!isAiCompleteV2RequestBody(rawBody)) {
		return context.json({ error: "Invalid request body" } as const, 400);
	}
	const requestBody: AiCompleteV2RequestBody = rawBody;
	const model: string = resolveModelId(requestBody.model, apiConfig.ai.models);
	const params: AiCompletionParams = {
		model,
		prompt: requestBody.prompt,
	};
	try {
		const result: AiCompletionResult = await aiClient.generateCompletion(params);
		const responseBody: AiCompleteResponseBody = { text: result.text };
		return context.json(responseBody);
	} catch {
		return context.json({ error: "AI provider error" } as const, 502);
	}
}

async function handleAiImageV2(context: Context<AppBindings>): Promise<Response> {
	if (isAiRateLimited(context)) {
		return context.json({ error: "Rate limit exceeded" } as const, 429);
	}
	let rawBody: unknown;
	try {
		rawBody = await context.req.json();
	} catch {
		return context.json({ error: "Invalid JSON body" } as const, 400);
	}
	if (!isAiImageV2RequestBody(rawBody)) {
		return context.json({ error: "Invalid request body" } as const, 400);
	}
	const requestBody: AiImageV2RequestBody = rawBody;
	const trimmedModel: string = requestBody.model?.trim() ?? "";
	const model: string = trimmedModel.length > 0 ? trimmedModel : DEFAULT_IMAGE_MODEL;
	const size: string | undefined = requestBody.size;
	const countRaw: number = requestBody.count ?? 1;
	const count: number = countRaw > 0 && countRaw <= 8 ? countRaw : 1;
	const params: AiImageParams = {
		model,
		prompt: requestBody.prompt,
		size,
		count,
	};
	try {
		const images: readonly AiImageResult[] = await imageClient.generateImages(params);
		const responseBody: AiImageV2ResponseBody = { images };
		return context.json(responseBody);
	} catch {
		return context.json({ error: "AI provider error" } as const, 502);
	}
}

async function handleAiChatV2(context: Context<AppBindings>): Promise<Response> {
	if (isAiRateLimited(context)) {
		return context.json({ error: "Rate limit exceeded" } as const, 429);
	}
	let rawBody: unknown;
	try {
		rawBody = await context.req.json();
	} catch {
		return context.json({ error: "Invalid JSON body" } as const, 400);
	}
	if (!isAiChatV2RequestBody(rawBody)) {
		return context.json({ error: "Invalid request body" } as const, 400);
	}
	const requestBody: AiChatV2RequestBody = rawBody;
	const trimmedMessages: readonly ChatMessage[] = truncateMessagesForV2(requestBody.messages);
	const input: ChatCompletionInput = {
		model: resolveModelId(requestBody.model, apiConfig.ai.models),
		messages: trimmedMessages,
		temperature: requestBody.temperature,
		maxTokens: requestBody.maxTokens,
	};
	try {
		const completion: ChatCompletionResponse = await aiClient.provider.createChatCompletion(input);
		const responseBody: AiChatResponseBody = { completion };
		return context.json(responseBody);
	} catch {
		return context.json({ error: "AI provider error" } as const, 502);
	}
}

interface AiCompleteV2RequestBody {
  readonly prompt: string;
  readonly model?: string;
}

function isAiCompleteV2RequestBody(value: unknown): value is AiCompleteV2RequestBody {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record: Record<string, unknown> = value as Record<string, unknown>;
  if (typeof record.prompt !== "string") {
    return false;
  }
  if ("model" in record && typeof record.model !== "string") {
    return false;
  }
  return true;
}

interface AiChatV2RequestBody {
  readonly messages: readonly ChatMessage[];
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
}

function isAiChatV2RequestBody(value: unknown): value is AiChatV2RequestBody {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record: Record<string, unknown> = value as Record<string, unknown>;
  if (!Array.isArray(record.messages)) {
    return false;
  }
  for (const item of record.messages) {
    if (item === null || typeof item !== "object") {
      return false;
    }
    const messageRecord: Record<string, unknown> = item as Record<string, unknown>;
    if (typeof messageRecord.role !== "string") {
      return false;
    }
  }
  if ("model" in record && typeof record.model !== "string") {
    return false;
  }
  if ("temperature" in record && typeof record.temperature !== "number") {
    return false;
  }
  if ("maxTokens" in record && typeof record.maxTokens !== "number") {
    return false;
  }
  return true;
}

interface AiImageV2RequestBody {
  readonly prompt: string;
  readonly model?: string;
  readonly size?: string;
  readonly count?: number;
}

function isAiImageV2RequestBody(value: unknown): value is AiImageV2RequestBody {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record: Record<string, unknown> = value as Record<string, unknown>;
  if (typeof record.prompt !== "string") {
    return false;
  }
  if ("model" in record && typeof record.model !== "string") {
    return false;
  }
  if ("size" in record && typeof record.size !== "string") {
    return false;
  }
  if ("count" in record && typeof record.count !== "number") {
    return false;
  }
  return true;
}

interface AiImageV2ResponseBody {
  readonly images: readonly AiImageResult[];
}

async function getOrgMembership(params: { readonly userId: string; readonly orgId: string }): Promise<OrgMembership | null> {
  const rows = await db
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

async function isUserOrgMember(params: { readonly userId: string; readonly orgId: string }): Promise<boolean> {
  const membership: OrgMembership | null = await getOrgMembership(params);
  return membership !== null;
}

async function logActivity(params: LogActivityInput): Promise<void> {
  const now: Date = new Date();
  await db.insert(schema.activity).values({
    id: randomUUID(),
    userId: params.userId,
    orgId: params.orgId ?? null,
    type: params.type,
    description: params.description ?? null,
    createdAt: now,
  });
}

function createAiClientFromConfig(config: ApiConfig): AiClient {
  const providerName = config.ai.provider;
  const apiKey: string | null = config.ai.apiKey;
  if (providerName === "openai" || providerName === "local") {
    const openAiConfig: OpenAiClientConfig = {
      baseUrl: config.ai.baseUrl,
      apiKey: apiKey as string,
    };
    return createOpenAiAiClient(openAiConfig);
  }
  return createMockAiClient();
}

function createImageClientFromConfig(config: ApiConfig): AiImageClient {
  const apiKey: string | null = config.ai.apiKey;
  if (apiKey) {
    const openAiConfig: OpenAiClientConfig = {
      baseUrl: config.ai.baseUrl,
      apiKey,
    };
    return createOpenAiImageClient(openAiConfig);
  }
  return createMockAiImageClient();
}

function createOrgSlug(params: { readonly name: string; readonly id: string }): string {
  const lower: string = params.name.toLowerCase();
  const normalized: string = lower.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const base: string = normalized || "workspace";
  const suffix: string = params.id.slice(0, 8);
  return `${base}-${suffix}`;
}

async function createOrganizationForUser(params: { readonly userId: string; readonly name: string }): Promise<OrganizationSummary> {
  const id: string = randomUUID();
  const now: Date = new Date();
  const nameValue: string = params.name;
  const slug: string = createOrgSlug({ name: nameValue, id });
  await db.insert(schema.organization).values({
    id,
    name: nameValue,
    slug,
    plan: null,
    billingStatus: null,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.organizationMember).values({
    id: randomUUID(),
    orgId: id,
    userId: params.userId,
    role: DEFAULT_ORG_ROLE_OWNER,
    createdAt: now,
  });
  const organization: OrganizationSummary = { id, name: nameValue, slug, role: DEFAULT_ORG_ROLE_OWNER };
  return organization;
}

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

async function getUserProfile(params: { readonly userId: string }): Promise<UserProfile | null> {
  const rows = await db.select().from(schema.user).where(eq(schema.user.id, params.userId)).limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  const profile: UserProfile = {
    id: row.id,
    email: row.email,
    name: row.name,
    username: row.username ?? null,
    displayUsername: row.displayUsername ?? null,
    twoFactorEnabled: row.twoFactorEnabled ?? null,
    onboardingComplete: row.onboardingComplete ?? null,
  };
  return profile;
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

  app.get("/health", (context: Context<AppBindings>) => {
    const ok: boolean = Boolean(db);
    return context.json({ ok } as const);
  });

  app.get("/auth/whoami", (context: Context<AppBindings>) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const authenticated: boolean = auth?.authenticated ?? false;
    const userId: string | undefined = auth?.userId;
    return context.json({ authenticated, userId } as const);
  });

  app.get("/auth/session", async (context: Context<AppBindings>) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const authenticated: boolean = auth?.authenticated ?? false;
    const userId: string | undefined = auth?.userId;
    if (!authenticated || !userId) {
      return context.json({ authenticated: false, userId: undefined, profile: null } as const);
    }
    const profile: UserProfile | null = await getUserProfile({ userId });
    return context.json({ authenticated, userId, profile } as const);
  });

  app.get("/ai/config", (context: Context<AppBindings>) => {
    const ai: AiConfig = apiConfig.ai;
    const ready: boolean = ai.provider === "mock" || ai.apiKey !== null;
    return context.json(
      {
        provider: ai.provider,
        baseUrl: ai.baseUrl,
        models: ai.models,
        ready,
      } as const,
    );
  });

  app.get("/me", async (context: Context<AppBindings>) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const userId: string | undefined = auth?.authenticated ? auth.userId : undefined;
    if (!userId) {
      return context.json({ error: "Unauthorized" } as const, 401);
    }
    const profile: UserProfile | null = await getUserProfile({ userId });
    if (!profile) {
      return context.json({ error: "User not found" } as const, 404);
    }
    return context.json({ profile } as const);
  });

  app.post("/ai/complete", async (context: Context<AppBindings>) => handleAiComplete(context));

  app.post("/ai/chat", async (context: Context<AppBindings>) => handleAiChat(context));

  app.post("/v2/ai/complete", async (context: Context<AppBindings>) => handleAiCompleteV2(context));
  app.post("/v2/ai/chat", async (context: Context<AppBindings>) => handleAiChatV2(context));
  app.post("/v2/ai/image", async (context: Context<AppBindings>) => handleAiImageV2(context));

  app.get("/orgs", async (context: Context<AppBindings>) => {
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

  app.post("/orgs", async (context: Context<AppBindings>) => {
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
    const organization: OrganizationSummary = await createOrganizationForUser({ userId, name });
    await logActivity({
      userId,
      orgId: organization.id,
      type: "org.created",
      description: `Created organization ${organization.name}`,
    });
    return context.json({ organization } as const, 201);
  });

  app.get("/orgs/:orgId/projects", async (context: Context<AppBindings>) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const userId: string | undefined = auth?.authenticated ? auth.userId : undefined;
    if (!userId) {
      return context.json({ error: "Unauthorized" } as const, 401);
    }
    const orgId: string = context.req.param("orgId");
    const member: boolean = await isUserOrgMember({ userId, orgId });
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

  app.post("/orgs/:orgId/projects", async (context: Context<AppBindings>) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const userId: string | undefined = auth?.authenticated ? auth.userId : undefined;
    if (!userId) {
      return context.json({ error: "Unauthorized" } as const, 401);
    }
    const orgId: string = context.req.param("orgId");
    const member: boolean = await isUserOrgMember({ userId, orgId });
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
      userId,
      orgId,
      type: "project.created",
      description: `Created project ${nameRaw}`,
    });
    const project: ProjectSummary = { id, name: nameRaw, status };
    return context.json({ project } as const, 201);
  });

  app.patch("/orgs/:orgId/projects/:projectId", async (context: Context<AppBindings>) => {
    const auth: AuthInfo | undefined = context.get("auth");
    const userId: string | undefined = auth?.authenticated ? auth.userId : undefined;
    if (!userId) {
      return context.json({ error: "Unauthorized" } as const, 401);
    }
    const orgId: string = context.req.param("orgId");
    const projectId: string = context.req.param("projectId");
    const member: boolean = await isUserOrgMember({ userId, orgId });
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
      userId,
      orgId,
      type: "project.updated",
      description: `Updated project ${projectId}`,
    });
    return context.json({ ok: true } as const);
  });

  app.get("/activity", async (context: Context<AppBindings>) => {
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

  return app;
}
