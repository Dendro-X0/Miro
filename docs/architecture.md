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

- The frontend calls the Hono API for data and mutations.
- The API layer resolves the current user via Better Auth.
- Database reads and writes go through the Drizzle schema in `@miro/db`.
- AI endpoints invoke helpers from `@miro/ai`.

As Miro evolves, this document can be expanded with concrete routes, entities, and interaction diagrams.
