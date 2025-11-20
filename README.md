# Miro Workspace

Miro is a full-stack reference app built on top of the Velocity Stack. It is designed as a **PWA-first generative workspace** that you can run locally, fork, and extend.

This README gives a high-level tour of the monorepo, the current **web PWA + AI backend**, and how to run everything locally before publishing to GitHub. The **public V1 (beta)** release focuses on the web PWA; desktop and mobile shells are experimental and part of the roadmap.

---

## Monorepo layout

- **apps/**
  - **miro-web/** – Next.js 16 PWA that provides the main chat-first UI, settings page, and model selector.
  - **miro-api/** – Hono HTTP API exposing AI chat/image endpoints and configuration.
  - **miro-desktop/** – Experimental Tauri shell that can wrap `miro-web` for a native desktop experience (roadmap; not required for V1).
  - **miro-mobile/** – Experimental Expo scaffold for a future native mobile client (for V1, the PWA is the primary mobile target).
- **packages/**
  - **ai/** – Shared AI types and helpers used by the API.
  - **auth/** – Better Auth wrapper and configuration.
  - **db/** – Drizzle schema and DB helpers.
  - **ui/** – Shared UI utilities and configuration.
- **docs/** – Architecture, stack, and usage documentation.

---

## V1 features at a glance

- **Chat-first PWA** with multi-chat sidebar, pinned chats, rename, and a responsive layout.
- **Unified text and image chat** – generate images and continue the conversation in the same thread.
- **AI & keys settings** – choose a provider, select text and image model presets, define custom models, and store BYOK keys locally.
- **Env-driven AI backend** – configure providers and model IDs entirely via environment variables, with a mock provider for local/dev.
- **Local-only user settings** – profile, appearance, and AI view preferences are stored in `localStorage` via a typed hook.
- **Ready-to-fork monorepo** – Next.js PWA, Hono API, and shared packages for AI, auth, DB, and UI utilities.

## Frontend: `apps/miro-web` (PWA)

The `miro-web` app is a Next.js 16 App Router project styled with Tailwind CSS v4. It is built to work well as a **progressive web app**:

- Installable PWA: web manifest and service worker are wired up so you can “Install Miro” on desktop and mobile.
- Chat-first layout with a centered welcome hero, multi-chat sidebar (with pin/rename), message list, and input bar.
- Inline AI responses for both **text and image generation** within a single chat.
- Local **Settings** page backed by a typed `useSettings` hook storing data in `localStorage`:
  - Workspace/profile basics (e.g. workspace name).
  - Appearance (system / light / dark theme).
  - **AI & keys** section to choose a provider, pick text/image model presets, add custom models, and optionally store a per-provider BYOK key on this device only.
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

Core environment variables:

- `MIRO_AI_PROVIDER` – one of `mock`, `openai`, `anthropic`, `google`, or `local`.
- `MIRO_AI_BASE_URL` – base URL for an OpenAI-compatible API (used directly when the provider is `openai` or `local`).
- `MIRO_AI_API_KEY` – primary API key used when the provider is `openai` or `local`.
- `MIRO_AI_MODEL_FAST` / `MIRO_AI_MODEL_BALANCED` / `MIRO_AI_MODEL_CREATIVE` – logical **text** model presets used by `/v2/ai/chat` and `/v2/ai/complete`.
- `MIRO_AI_IMAGE_MODEL` – default image model ID used by `/v2/ai/image` when the request does not include an explicit `model` field.

Additional optional provider-specific overrides exist, for example:

- `MIRO_AI_OPENAI_BASE_URL`, `MIRO_AI_OPENAI_API_KEY`, `MIRO_AI_OPENAI_MODEL_FAST`, `MIRO_AI_OPENAI_MODEL_BALANCED`, `MIRO_AI_OPENAI_MODEL_CREATIVE`, `MIRO_AI_OPENAI_IMAGE_MODEL`
- `MIRO_AI_ANTHROPIC_BASE_URL`, `MIRO_AI_ANTHROPIC_API_KEY`, `MIRO_AI_ANTHROPIC_MODEL_FAST`, `MIRO_AI_ANTHROPIC_MODEL_BALANCED`
- `MIRO_AI_GOOGLE_BASE_URL`, `MIRO_AI_GOOGLE_API_KEY`, `MIRO_AI_GOOGLE_MODEL_TEXT_FAST`, `MIRO_AI_GOOGLE_MODEL_TEXT_BALANCED`, `MIRO_AI_GOOGLE_MODEL_IMAGE`
- `MIRO_AI_LOCAL_BASE_URL`, `MIRO_AI_LOCAL_MODEL_TEXT`, `MIRO_AI_LOCAL_MODEL_IMAGE`

These values are used to build a runtime description of available providers and models, which the frontend **AI & keys** card consumes when showing provider tiles and model presets.

When `MIRO_AI_PROVIDER` is `openai` or `local`, `MIRO_AI_API_KEY` is required at startup. For other providers the API can run without a primary key and will fall back to mock behavior unless you extend the `@miro/ai` integration.

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
MIRO_AI_PROVIDER=mock            # or openai / anthropic / google / local
MIRO_AI_BASE_URL=https://api.openai.com/v1
MIRO_AI_API_KEY=sk-...           # required for openai/local
MIRO_AI_MODEL_FAST=gpt-4o-mini
MIRO_AI_MODEL_BALANCED=gpt-4o
MIRO_AI_MODEL_CREATIVE=gpt-4.1-mini
MIRO_AI_IMAGE_MODEL=gpt-image-1
```

You can point `MIRO_AI_BASE_URL` at a local OpenAI-compatible server such as LocalAI.

### Start the backend

```bash
pnpm dev --filter @miro/api
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
  - Experimental only for now. The repo is wired for Tauri v2, but the desktop shell is **not part of the supported V1 surface** and may require additional Rust/Tauri setup on your machine.
  - If you want to experiment locally, ensure `miro-web` is running on `http://localhost:3000` and then run `pnpm dev --filter miro-desktop`.
- **Mobile (Expo):**
  - Experimental scaffold only; `apps/miro-mobile` can be started with `pnpm --filter miro-mobile start`, but the recommended experience is the **PWA installed on mobile**.

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

Release notes and future plans:

- [`CHANGELOG.md`](./CHANGELOG.md) – notable changes across public releases.
- [`ROADMAP.md`](./ROADMAP.md) – planned work beyond the current PWA-first beta.

---

## License

This repository does **not** currently declare an open-source license. Before publishing to GitHub as OSS, add a `LICENSE` file (for example MIT or Apache-2.0) that matches how you intend others to use this code.
