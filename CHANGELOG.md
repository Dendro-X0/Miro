# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Mobile (Native Expo)

- Next-version target: native RN shell + `@miro/core` (not WebView)
- Streaming chat via `MiroApiClient.streamChatText` with Stop
- Chat / Image modes; gallery (AsyncStorage); vision attach (`expo-image-picker`)
- Separate Miro `apiBaseUrl` vs optional provider `byokBaseUrl`
- Storage quotas for vision/gallery; atomic backup import with rollback + chat refresh
- Markdown export (share) + passphrase-encrypted `.mirobackup.json` (PBKDF2 / AES-GCM)
- Shared helpers in `@miro/core` (`miro:parts`, backup crypto, `formatChatMarkdown`)
- Docs: [`docs/mobile.md`](./docs/mobile.md); ROADMAP Milestones 1–3 complete

### Hardening

- Web/desktop persist client message IDs (regenerate/edit truncate works on live turns)
- Desktop vault backup import runs in a SQLite transaction
- API chat: rate limit + 32-message history truncate wired
- `streamChat` surfaces API error bodies; stream empty-parse falls back to raw body

### Planned

- Optional signed / coffee-price desktop binaries
- ComfyUI localhost bridge (second image path)
- Production PWA deploy guide
- Node-free API sidecar (no Node on PATH for release)

## [0.2.0] – 2026-07-21

Desktop-first v1 band complete for the scoped golden path, plus v1.x polish that landed before this cut.

### Highlights

- **Tauri desktop packaging** — `pnpm desktop:release` (icons, API sidecar, static web export, installers)
- **Dynamic model discovery** — `POST /ai/models` lists models from credentials / Ollama / OpenAI-compatible gateways
- **Anthropic** adapter for text chat
- **Vision**, regenerate/edit turns, Markdown export, system prompts, encrypted backup

### Desktop

- API spawn on by default (bundled sidecar → pnpm → node/tsx); `MIRO_DESKTOP_SPAWN_API=0` to disable
- Release checklist and known gaps documented in [`docs/desktop.md`](./docs/desktop.md)
- Encrypted vault: sessions, messages, gallery, per-chat instructions, backup export/import, message truncate

### Chat & AI

- Anthropic via `@ai-sdk/anthropic` and `MIRO_AI_ANTHROPIC_API_KEY`
- Image attach (vision) for Google, OpenAI-compatible, and Anthropic
- Regenerate last assistant turn; edit user message and resend
- Global + per-chat system prompts
- Markdown chat export
- Passphrase-encrypted backup (chats + gallery) on desktop and web
- Header model switcher uses discovered models; free-form model ID via search
- Optional BYOK **API base URL** (OpenRouter, Groq, remote Ollama, etc.)

### Web / API

- `POST /ai/models` with server-side cache
- Next rewrite for `/ai/models`
- Dead web-search / unattached controls removed
- Root `pnpm dev` runs `@miro/api` + `miro-web` only (avoids port clash with Tauri)

### Mobile

- Expo client remains **not** a v1 product surface
- Scaffold improved: SecureStore BYOK, AsyncStorage sessions, provider/model discovery
- Documented as deferred / optional (v2+)

### Dependencies

- Next.js 16.2, React 19.2 (web), Hono 4.12, Turbo 2.10, Tauri CLI 2.11
- AI SDK kept on v6 / `@ai-sdk` v3 (v7 deferred); gateway override for registry consistency
- Expo mobile kept on SDK 54

### Documentation

- README, ROADMAP, getting-started, usage, desktop, overview, architecture, and stack aligned to 0.2.0

## [0.1.0] – Public beta

Initial public (beta) release of Miro Workspace:

- **Chat-first PWA** (`apps/miro-web`) with multi-chat sidebar, pinned chats, rename, and responsive layout.
- **Unified text and image chat** with `/v2/ai/chat` and `/v2/ai/image` backed by `apps/miro-api`.
- **AI & keys settings** allowing provider selection, model presets (text and image), custom model IDs, and BYOK stored locally.
- **Env-driven AI backend** using `MIRO_AI_*` env vars with support for mock, OpenAI-compatible, Anthropic, Google, and local providers.
- Monorepo structure with shared packages for AI, auth, DB, and UI utilities.

### Direction (carried into 0.2.0)

- Repositioned Miro from a **SaaS boilerplate** to a **private, local-first BYOK AI studio** — fast, encrypted, desktop-first.
- Retired the active **Miro Pro** enterprise track; v1 focuses on a shippable single-user tool.

### Shipped through Phase 4 (rolled into 0.2.0)

- Golden-path providers, encrypted desktop vault, Tauri packaging, API images + Gallery
- [`docs/getting-started.md`](./docs/getting-started.md), [`docs/self-hosting.md`](./docs/self-hosting.md), [`docs/desktop.md`](./docs/desktop.md)
- Tier 1 polish: API sidecar, Markdown export, system prompts
