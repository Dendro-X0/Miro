# Stack

Miro builds on a TypeScript-first stack optimized for a modular, AI-enabled PWA.

## Frontend

- Next.js 16 App Router (`apps/miro-web`)
- React Server Components where appropriate
- Tailwind CSS v4 for styling

## API

- Hono (`apps/miro-api`) as a lightweight HTTP server
- JSON endpoints for workspaces, documents, AI actions, and activity

## Authentication

- Better Auth (`@miro/auth`) for email/password and optional social logins

## Database

- Postgres with Drizzle ORM (`@miro/db`)
- Multi-tenant pattern based on users, workspaces, memberships, and activity

## AI

- `@miro/ai` package as the integration layer to external AI providers
  - Starts with a mock client
  - Can later wrap OpenAI, Anthropic, or other models

## Tooling

- pnpm workspaces
- Turbo for dev/build/typecheck orchestration
- TypeScript in strict mode
