# Stack

Miro builds on a TypeScript-first stack optimized for a modular, AI-enabled PWA.

## Frontend

- Next.js 16 App Router (`apps/miro-web`)
- React Server Components where appropriate
- Tailwind CSS v4 for styling
- Modular UI layer under `apps/miro-web/app/modules/ui` for shared components, hooks, and UI types

## API

- Hono (`apps/miro-api`) as a lightweight HTTP server
- JSON endpoints for AI chat and image generation, plus future workspace and activity APIs

## Authentication

- Better Auth (`@miro/auth`) for email/password and optional social logins

## Database

- Postgres with Drizzle ORM (`@miro/db`)
- Multi-tenant pattern based on users, workspaces, memberships, and activity

## AI

- `@miro/ai` package as the integration layer to external AI providers
  - Includes a mock client for local development
  - Wraps OpenAI-compatible providers and can be extended for Anthropic, Google, local, or other backends
  - Powers `/v2/ai/chat`, `/v2/ai/complete`, and `/v2/ai/image` routes used by the PWA

## Tooling

- pnpm workspaces
- Turbo for dev/build/typecheck orchestration
- TypeScript in strict mode
