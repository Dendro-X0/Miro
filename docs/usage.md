# Usage

This document describes how to run the current V1 of Miro locally: a chat-first PWA (`apps/miro-web`) backed by an AI API (`apps/miro-api`).

## Prerequisites

- Node.js >= 20.19.0
- pnpm
- (Optional) Postgres if you plan to extend the workspace/backend beyond the AI demo

## Install dependencies

From the `miro/` root:

```bash
pnpm install
```

## Configure AI environment

Create a `.env` file at the repo root (or use your process environment) and set at least:

```bash
MIRO_AI_PROVIDER=mock            # or openai / anthropic / google / local
MIRO_AI_BASE_URL=https://api.openai.com/v1
MIRO_AI_API_KEY=sk-...           # required for openai/local
MIRO_AI_MODEL_FAST=gpt-4o-mini
MIRO_AI_MODEL_BALANCED=gpt-4o
MIRO_AI_MODEL_CREATIVE=gpt-4.1-mini
MIRO_AI_IMAGE_MODEL=gpt-image-1
```

These values are parsed by `apps/miro-api/src/config.ts` to build a runtime AI configuration that is also exposed via `GET /ai/config`.

## Run the API and web app

In one terminal, start the API:

```bash
pnpm dev --filter @miro/api
```

In another, start the PWA:

```bash
pnpm dev --filter miro-web
```

Open `http://localhost:3000` in your browser. From there you can:

- Start chatting with Miro using the default model profile.
- Open **Settings → AI & keys** to:
  - Inspect the resolved provider and model presets.
  - Choose a text model profile and, when available, an image model for `/v2/ai/image`.
  - Optionally enter a personal API key (BYOK) stored only on this device.

## Helpful scripts

At the repo root:

- `pnpm dev` – run workspace dev tasks via Turbo.
- `pnpm typecheck` – typecheck all packages and apps.
- `pnpm build` – build all apps for production.
