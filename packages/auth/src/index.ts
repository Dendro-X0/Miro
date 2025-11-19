import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, twoFactor, username } from "better-auth/plugins";
import type { DatabaseSchema, Db } from "@miro/db";

interface MagicLinkParams {
  readonly email: string;
  readonly url: string;
}

export interface CreateAuthServerParams {
  readonly appName?: string;
  readonly baseUrl: string;
  readonly db: Db;
  readonly schema: DatabaseSchema;
}

export type AuthInstance = ReturnType<typeof betterAuth>;

function getRequiredEnv(name: string): string {
  const value: string | undefined = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Environment variable ${name} is not set.`);
    }
    // In non-production environments, fall back to a deterministic
    // placeholder so local builds can succeed without configuration.
    // eslint-disable-next-line no-console
    console.warn(`${name} is not set. Using a development placeholder value.`);
    return `development-placeholder-${name.toLowerCase()}`;
  }
  return value;
}

function getOptionalEnv(name: string): string | undefined {
  const value: string | undefined = process.env[name];
  if (!value || !value.trim()) {
    return undefined;
  }
  return value;
}

/**
 * Create a Better Auth server instance configured for Miro.
 */
export default function createAuthServer(params: CreateAuthServerParams): AuthInstance {
  const secret: string = getRequiredEnv("BETTER_AUTH_SECRET");
  const trustedOrigins: string[] = [params.baseUrl];

  const githubClientId: string | undefined = getOptionalEnv("GITHUB_CLIENT_ID");
  const githubClientSecret: string | undefined = getOptionalEnv("GITHUB_CLIENT_SECRET");
  const googleClientId: string | undefined = getOptionalEnv("GOOGLE_CLIENT_ID");
  const googleClientSecret: string | undefined = getOptionalEnv("GOOGLE_CLIENT_SECRET");

  const socialProviders: {
    github?: { readonly clientId: string; readonly clientSecret: string };
    google?: { readonly clientId: string; readonly clientSecret: string };
  } = {};
  if (githubClientId && githubClientSecret) {
    socialProviders.github = { clientId: githubClientId, clientSecret: githubClientSecret };
  }
  if (googleClientId && googleClientSecret) {
    socialProviders.google = { clientId: googleClientId, clientSecret: googleClientSecret };
  }

  return betterAuth({
    appName: params.appName ?? "Miro",
    baseURL: params.baseUrl,
    secret,
    trustedOrigins,
    database: drizzleAdapter(params.db as unknown as object, {
      schema: params.schema as unknown as object,
      provider: "pg",
    }),
    session: {
      expiresIn: 60 * 60 * 24 * 30,
    },
    emailAndPassword: {
      enabled: true,
    },
    socialProviders,
    plugins: [
      username(),
      magicLink({
        async sendMagicLink(params: MagicLinkParams): Promise<void> {
          const email: string = params.email;
          const url: string = params.url;
          // eslint-disable-next-line no-console
          console.log("Magic link", { email, url });
        },
      }),
      twoFactor(),
    ],
  }) as AuthInstance;
}
