# Architecture

Miro is organized as a pnpm monorepo with clear boundaries between apps and shared packages.

## Monorepo layout

- `apps/miro-web` – Next.js PWA frontend
- `apps/miro-api` – Hono API
- `packages/db` – Drizzle schema and DB helper
- `packages/auth` – Better Auth configuration
- `packages/ai` – AI integration layer
- `packages/ui` – shared UI utilities and configuration

## Data and control flow

- The `miro-web` frontend calls the Hono API for data and mutations.
- For V1, the primary calls are AI-related:
  - `GET /ai/config` to read the resolved provider and logical model IDs.
  - `POST /v2/ai/chat` and `POST /v2/ai/complete` for text responses.
  - `POST /v2/ai/image` for image generation.
- The API layer resolves the AI configuration from environment variables in `apps/miro-api/src/config.ts`.
- AI endpoints invoke helpers from `@miro/ai` using that configuration.
- Local settings (profile, appearance, AI view state) are stored on the client via a typed `useSettings` hook and do not require a database.

As Miro evolves, this document can be expanded with concrete routes, entities, and interaction diagrams.
