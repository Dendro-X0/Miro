# Stack

Miro is a TypeScript-first monorepo optimized for a **small, modular BYOK AI client** — Tauri desktop first, web PWA for demo/dev.

**Release:** [0.2.0](../CHANGELOG.md).

## Frontend

- **Next.js 16** App Router (`apps/miro-web`) — chat shell, settings, PWA / static desktop export
- **React 19** — streaming chat and interactive settings
- **Tailwind CSS v4** — styling
- **Modular UI** — `apps/miro-web/app/modules/ui`; `app/shell/` for wiring; `app/lib/` for catalog, vault bridge, backup

## Desktop

- **Tauri v2** (`apps/miro-desktop`) — native shell (~50 MB installer target)
- **Rust** — OS keychain, encrypted SQLite vault, API process spawn
- Embeds the same web UI; release builds use Next `output: 'export'` + API sidecar
- Packaging: [`desktop.md`](./desktop.md) (`pnpm desktop:dev` / `desktop:release`)

## API (optional self-host)

- **Hono** (`apps/miro-api`, `@miro/api`) — lean HTTP for web demo, desktop spawn, and self-hosting
- Routes: AI config, model list, chat streaming, image generation
- Env-driven provider config (`MIRO_AI_*`)

## AI

- **`@miro/ai`** — thin provider adapters + `listModels`
  - **Golden path:** mock, Google Gemini, OpenAI-compatible, Ollama (`local`), Anthropic
- **Vercel AI SDK** (`ai` v6 / `@ai-sdk` v3) — streaming text in `@miro/api`
- Image: OpenAI-compatible `/images/generations` + Google Imagen; ComfyUI deferred

## Storage & privacy

| Layer | Web (demo/dev) | Desktop (product) |
|-------|----------------|-------------------|
| Settings / BYOK | localStorage | OS keychain + encrypted vault metadata |
| Chat / gallery | localStorage | Encrypted SQLite vault |
| Backup | Passphrase-encrypted file | Same (export/import vault) |
| Server DB | Not used for chat | Not required |

## Shared client layer

- **`@miro/core`** — types, `MiroApiClient` (`fetchConfig`, `listModels`, chat, image), settings helpers
- **`@miro/ui`** — design tokens (used by Expo scaffold)

## Packages present but out of v1 client path

- **`@miro/auth`** / **`@miro/db`** — optional when `MIRO_ENABLE_AUTH=true`; not required for BYOK desktop

## Tooling

- **pnpm** workspaces · **Turbo** · **TypeScript** 5.9
- **CodaCtrl** (external) — optional desktop performance profiling

## Platforms

| Surface | Stack | 0.2.0 |
|---------|-------|:-----:|
| Web PWA | Next.js | Demo / dev |
| Desktop | Tauri v2 + Rust | Primary product |
| Mobile | Expo SDK 54 scaffold | 🚧 Deferred |

See [`ROADMAP.md`](../ROADMAP.md) for anti-goals and future tiers.
