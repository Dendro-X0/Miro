# Usage

Miro is still in early scaffolding. These steps describe how the monorepo is intended to be used once the apps are wired up.

## Prerequisites

- Node.js >= 20.19.0
- pnpm
- A Postgres instance

## Install dependencies

From the `miro/` root:

```bash
pnpm install
```

## Development workflow (planned)

- `pnpm dev` – run the API and web app together via Turbo
- `pnpm typecheck` – typecheck all packages and apps
- `pnpm build` – build all apps for production

Once the `apps/miro-web` and `apps/miro-api` scaffolding is in place, this document can be extended with concrete routes, flows, and environment variable configuration.
