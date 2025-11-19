# Miro Workspace

Miro is a full-stack reference app built on top of the Velocity Stack. It is designed as a **PWA-first generative workspace** that you can run locally, fork, and extend.

This README gives a high-level tour of the monorepo, the current **web PWA + AI backend**, and how to run everything locally before publishing to GitHub.

---

## Monorepo layout

- **apps/**
  - **miro-web/** – Next.js 16 PWA that provides the main chat-first UI, settings page, and model selector.
  - **miro-api/** – Hono HTTP API exposing AI chat/image endpoints and configuration.
  - **miro-desktop/** – Tauri shell that can wrap `miro-web` for a native desktop experience.
  - **miro-mobile/** – Expo scaffold for a future native mobile client (PWA is the primary mobile target for now).
- **packages/**
  - **ai/** – Shared AI types and helpers used by the API.
  - **auth/** – Better Auth wrapper and configuration.
  - **db/** – Drizzle schema and DB helpers.
  - **ui/** – Shared UI utilities and configuration.
- **docs/** – Architecture, stack, and usage documentation.

---

## Frontend: `apps/miro-web` (PWA)

The `miro-web` app is a Next.js 16 App Router project styled with Tailwind CSS v4. It is built to work well as a **progressive web app**:

- Installable PWA: web manifest and service worker are wired up so you can “Install Miro” on desktop and mobile.
- Chat-first layout with a centered welcome hero, message list, and input bar.
- Local **Settings** page backed by a typed `useSettings` hook storing data in `localStorage`:
  - Workspace/profile basics (e.g. workspace name).
  - Appearance (system / light / dark theme).
  - AI section that surfaces provider/model info from the backend (keys are treated as read-only).
  - Data & storage toggles such as local conversation history.

For day-to-day use and OSS forks, the PWA is the primary client.

---

## Backend: `apps/miro-api`

The backend is implemented in `apps/miro-api` and currently focuses on **AI capabilities** and future workspace APIs.

Key pieces:

- **Framework:** [Hono](https://hono.dev/) running on Node.
- **Config:** `src/config.ts` reads an AI configuration from environment variables and validates it.
- **AI endpoints:**
  - `POST /ai/chat` – simple chat endpoint used by early clients.
  - `POST /v2/ai/chat` – structured chat endpoint that accepts richer input and truncates long histories.
  - `POST /v2/ai/image` – image generation endpoint (where supported by the provider).
  - `GET /ai/config` – returns the resolved AI provider, base URL, and logical model IDs so the frontend can show connection status.

The multi-org workspace model, auth, and activity feed scaffolding are present but still evolving; the AI routes above are the most stable part of the API today.

---

## AI configuration

AI configuration is read from environment variables in `miro/.env` (or your process environment) and parsed in `apps/miro-api/src/config.ts`.

Supported provider values:

- `MIRO_AI_PROVIDER` – one of `mock`, `openai`, `anthropic`, or `local`.
- `MIRO_AI_BASE_URL` – base URL for an OpenAI-compatible API (used for `openai` and `local`).
- `MIRO_AI_API_KEY` – API key for the chosen provider.
- `MIRO_AI_MODEL_FAST` / `MIRO_AI_MODEL_BALANCED` / `MIRO_AI_MODEL_CREATIVE` – logical model presets used by the chat and image endpoints.

When `MIRO_AI_PROVIDER` is `openai` or `local`, `MIRO_AI_API_KEY` is required. For `mock` and `anthropic`, the API can run without a real key for local development.

The resolved configuration is exposed as `ai` on the `ApiConfig` returned by `getApiConfig` and surfaced to the frontend via `GET /ai/config`.

---

## Running locally

### Prerequisites

- Node.js `>= 20.19.0`
- [pnpm](https://pnpm.io/)

Optional (for a full database-backed setup):

- Postgres

### Install dependencies

From the `miro/` root:

```bash
pnpm install
```

### Configure environment

Create a `.env` file in the `miro/` root (or copy from `.env.example` if present) and set at least:

```bash
MIRO_AI_PROVIDER=mock            # or openai / anthropic / local
MIRO_AI_BASE_URL=https://api.openai.com/v1
MIRO_AI_API_KEY=sk-...           # required for openai/local
MIRO_AI_MODEL_FAST=gpt-4o-mini
MIRO_AI_MODEL_BALANCED=gpt-4o
MIRO_AI_MODEL_CREATIVE=gpt-4.1-mini
```

You can point `MIRO_AI_BASE_URL` at a local OpenAI-compatible server such as LocalAI.

### Start the backend

```bash
pnpm dev --filter miro-api
```

By default the API listens on `http://localhost:8787`.

### Start the web PWA

In a second terminal:

```bash
pnpm dev --filter miro-web
```

Then open `http://localhost:3000` in your browser. You can install the PWA from the browser’s “Install app” or “Add to Home Screen” menu.

### Optional: desktop and mobile

- **Desktop (Tauri):**
  - Ensure `miro-web` is running.
  - From `apps/miro-desktop`, run `pnpm dev --filter miro-desktop` to launch the Tauri shell.
- **Mobile (Expo):**
  - Experimental scaffold only; `apps/miro-mobile` can be started with `pnpm --filter miro-mobile start`, but the recommended experience is the PWA.

---

## Scripts

At the repo root:

- `pnpm dev` – run workspace dev tasks via Turbo (or run app-specific `dev` as shown above).
- `pnpm build` – build all apps.
- `pnpm start` – start built apps.
- `pnpm typecheck` – type-check all packages and apps.
- `pnpm lint` – run linters where configured.

---

## Documentation

Additional documentation lives under [`docs/`](./docs):

- [`overview.md`](./docs/overview.md) – high-level concept and customization notes.
- [`stack.md`](./docs/stack.md) – libraries and tools used across the monorepo.
- [`architecture.md`](./docs/architecture.md) – monorepo layout and data/control flow.
- [`usage.md`](./docs/usage.md) – installation and development workflow.

---

## License

This repository does **not** currently declare an open-source license. Before publishing to GitHub as OSS, add a `LICENSE` file (for example MIT or Apache-2.0) that matches how you intend others to use this code.
