# Architecture

Miro is a pnpm monorepo built as a **private BYOK AI studio**: modular web UI, lean Hono API, and a Tauri desktop shell for encrypted local storage.

**Release:** [0.2.0](../CHANGELOG.md).

## Monorepo layout

| Path | Role | Status (0.2.0) |
|------|------|----------------|
| `apps/miro-web` | Next.js PWA — chat, settings, UI modules | ✅ Demo / primary UI |
| `apps/miro-api` | Hono API (`@miro/api`) — chat, image, config, model list | ✅ Lean default |
| `apps/miro-desktop` | Tauri v2 — keychain, vault, API sidecar, packaging | ✅ Primary product |
| `apps/miro-mobile` | Native Expo — streaming chat, BYOK, sessions | 🚧 Next version |
| `packages/core` | Shared types + API client + settings | ✅ Web + mobile |
| `packages/ai` | Provider adapters + `listModels` | ✅ Golden path + Anthropic |
| `packages/auth` | Better Auth | Present; optional API experiment |
| `packages/db` | Drizzle / Postgres schema | Present; not required for BYOK |
| `packages/ui` | Design tokens | ✅ Mobile; web has local modules |

```
┌─────────────────────────────────────────────────────────┐
│  miro-web (Next.js)                                      │
│  shell/ — state, routing    modules/ui — components      │
└───────────────────────────┬─────────────────────────────┘
                            │ embedded in (static export)
┌───────────────────────────▼─────────────────────────────┐
│  miro-desktop (Tauri v2 / Rust)                          │
│  • OS keychain for API keys                              │
│  • Encrypted SQLite — sessions, messages, gallery        │
│  • Spawns lean @miro/api (sidecar / pnpm / node)         │
└───────────────────────────┬─────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   Cloud APIs          Ollama (local)     ComfyUI (local)
   OpenAI / Anthropic  :11434             deferred (v1.x)
   Google / OpenRouter
```

## Data and control flow (0.2.0)

1. **Web / desktop UI** calls `@miro/api` (same-origin rewrites in Next; absolute URL in Tauri).
2. Primary routes:
   - `GET /ai/config` — resolved provider runtime + env model defaults
   - `POST /ai/models` — live model discovery (BYOK / env / Ollama)
   - `POST /api/chat` — streaming text (multipart vision supported)
   - `POST /v2/ai/image` — image generation (OpenAI-compatible / Google Imagen / mock)
3. `apps/miro-api/src/config.ts` reads `MIRO_AI_*`; request body may override `provider`, `byokKey`, `baseUrl`, `model`.
4. Routes invoke `@miro/ai` (`createModel`, `listModels`, image clients).
5. **Desktop persistence** — Rust vault commands (sessions, messages, gallery, backup, truncate). BYOK in OS keychain.
6. **Web persistence** — localStorage for chats / gallery / settings (not E2EE). Encrypted backup file optional.

## Frontend UI architecture

- **App shell** — `apps/miro-web/app/_app-shell.tsx` composes layout, sidebar, and main views.
- **`app/shell/`** — thin containers: view state, data fetching, props for UI modules.
- **`app/modules/ui/`** — presentation (model switcher, chat input, markdown, errors).
- **`app/lib/`** — history, gallery, backup, model catalog, Tauri bridge.
- **Settings** — AI & keys (discovery + BYOK base URL), profile, data (backup), about.

## What v1 does not include

- Multi-tenant server, RBAC, or team workspaces
- RAG, document libraries, or agent/plugin marketplaces
- Bundled ComfyUI, Python, or CUDA
- Mobile privacy vault (Expo is next-version; SecureStore only, not E2EE)

See [`ROADMAP.md`](../ROADMAP.md) for phased delivery and [`CHANGELOG.md`](../CHANGELOG.md) for 0.2.0.
