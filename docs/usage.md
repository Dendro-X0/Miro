# Usage

Reference for env vars, providers, and scripts (**0.2.0**). For the **under-10-minute golden path**, start with [`getting-started.md`](./getting-started.md).

> **Privacy:** Desktop carries the encrypted vault + OS keychain story. The web PWA is for **demo and development** — browser history is not end-to-end encrypted.

## Prerequisites

- Node.js >= 20.19.0
- pnpm
- (Optional) [Ollama](https://ollama.com/) for local models
- (Optional) Rust + Tauri deps for desktop — [`desktop.md`](./desktop.md)
- (Optional) Postgres — only for full `MIRO_ENABLE_AUTH=true` experiments; **not required** for lean BYOK

## Install dependencies

From the repo root:

```bash
pnpm install
```

## Configure AI environment

For the web demo or lean API, create a `.env` file at the repo root (or set process environment variables):

```bash
MIRO_AI_PROVIDER=mock            # mock | openai | openai-compatible | google | anthropic | local
MIRO_AI_BASE_URL=https://api.openai.com/v1
MIRO_AI_API_KEY=sk-...           # required for openai / openai-compatible / google
MIRO_AI_MODEL_FAST=gpt-4o-mini
MIRO_AI_MODEL_BALANCED=gpt-4o
MIRO_AI_MODEL_CREATIVE=gpt-4.1-mini
MIRO_AI_IMAGE_MODEL=gpt-image-1
```

**Golden path examples**

```bash
# OpenAI / OpenRouter / Groq (any OpenAI-compatible endpoint)
MIRO_AI_PROVIDER=openai-compatible
MIRO_AI_BASE_URL=https://api.openai.com/v1
MIRO_AI_API_KEY=sk-...
MIRO_AI_MODEL_BALANCED=gpt-4o-mini

# Ollama (no API key required)
MIRO_AI_PROVIDER=local
MIRO_AI_BASE_URL=http://localhost:11434/v1
MIRO_AI_MODEL_BALANCED=llama3.2
```

Values are parsed by `apps/miro-api/src/config.ts` and exposed at `GET /ai/config`.

**Dynamic model discovery:** When you add a BYOK key (or the server has env credentials), Miro calls `POST /ai/models` to list models from the provider API — OpenAI-compatible `/models`, Ollama `/api/tags`, Google Generative Language API, Anthropic `/models`. Results appear in Settings and the header model switcher. Use **API base URL** in Settings for OpenRouter (`https://openrouter.ai/api/v1`), Groq, Together, or a remote Ollama host. You can also type any model ID in the switcher search.

**Provider status (v1 golden path):**

| Provider | Settings UI | `@miro/ai` adapter |
|----------|:-----------:|:------------------:|
| Mock | ✅ | ✅ |
| Google Gemini | ✅ | ✅ |
| OpenAI-compatible | ✅ | ✅ |
| Ollama (local) | ✅ | ✅ |
| Anthropic | ✅ | ✅ |

Image generation uses **Option A (API)**: OpenAI-compatible image endpoints and Google Imagen. Mock still works without a key. ComfyUI is deferred to v1.x.

| Provider | Image |
|----------|:-----:|
| Mock | ✅ placeholder |
| OpenAI / openai-compatible | ✅ `/images/generations` |
| Google Imagen | ✅ `models/{id}:predict` |
| Local / Ollama | ❌ text only in v1 |
| ComfyUI | 🚧 v1.x |

Set `MIRO_AI_IMAGE_MODEL` / `MIRO_AI_OPENAI_IMAGE_MODEL` (default `dall-e-3`) or pick an image model in Settings. Generated images appear in-thread and in **Gallery** (encrypted vault on desktop).

**Vision (image attach in chat):** On Google, OpenAI-compatible, and Anthropic models, use the paperclip in the chat input to attach an image with a prompt. Attachments are stored in history as multipart messages (desktop vault or browser localStorage).

## Lean vs full API

| Mode | Env | Behavior |
|------|-----|----------|
| **Lean** (default) | `MIRO_ENABLE_AUTH` unset or `false` | AI + health only; no Postgres / Better Auth import |
| **Full** | `MIRO_ENABLE_AUTH=true` | Dynamically loads `@miro/db` + `@miro/auth` and multi-user routes |

Lean is the BYOK self-host path. Full mode needs `DATABASE_URL` and is for optional multi-user experiments.

## Web API proxy (miro-web)

`miro-web` uses **same-origin** requests via Next.js rewrites (no CORS setup in dev):

| Browser path | Proxied to |
|--------------|------------|
| `/api/chat` | `@miro/api` streaming chat |
| `/ai/config` | Provider + model config |
| `/v2/ai/*` | Image and legacy AI routes |

Override the backend target with `NEXT_PUBLIC_MIRO_API_BASE_URL` (default `http://127.0.0.1:8787`). The web app uses `@miro/core` (`app/lib/miro-api.ts`) for all API calls. In Tauri / desktop static builds, the client uses that absolute URL directly (no Next rewrites).

## Run the API and web app

**Terminal 1 — API:**

```bash
pnpm dev --filter @miro/api
```

**Terminal 2 — PWA:**

```bash
pnpm dev --filter miro-web
```

   Open `http://localhost:3100` in your browser. You can:

- Chat using the default model profile (mock or configured provider).
- Open **Settings → AI & keys** to:
  - Pick a provider and model presets (text / image filters).
  - Enter a personal API key (BYOK) — on **desktop**, stored in the OS keychain; on **web**, localStorage for this browser only.

## BYOK: web vs desktop

| Concern | Web PWA (demo/dev) | Desktop (product) |
|---------|--------------------|-------------------|
| API keys | Settings / localStorage + optional server env | OS keychain |
| Chat history | localStorage (optional) | Encrypted SQLite vault |
| Gallery | localStorage | Encrypted vault |
| Primary role | UI demo & development | Daily driver |

## Desktop (Tauri)

Primary packaging path — see [`desktop.md`](./desktop.md) for build, spawn, and signing details.

```bash
pnpm desktop:dev     # debug: spawns lean @miro/api by default + miro-web :3100
pnpm desktop:build   # static-export web UI → Tauri installer (unsigned)
```

**Desktop-only features**

- Encrypted SQLite vault for sessions and messages (`vault.db` in app data)
- BYOK keys in OS keychain (not localStorage)
- Sidebar backed by persisted vault sessions (pin, rename, auto-title)
- Absolute API URL in the webview (`http://127.0.0.1:8787` by default)

**Web PWA history**

- When “Store conversation history” is on (default), chats persist in `localStorage` for this browser
- Not end-to-end encrypted in the browser — use the desktop app for the encrypted vault

**Encrypted backup (Settings → Data):** Export or import chats + gallery as a passphrase-encrypted `.mirobackup.json` file. Works on desktop vault and web local storage.

## Optional: local image via ComfyUI (v1.x)

Deferred — v1 uses cloud/API image generation. A future ComfyUI localhost bridge will submit **preset** workflows only (Miro does not bundle ComfyUI or GPU runtimes).

## Mobile (Expo)

Native Expo client — **next-version** track. Shares `@miro/core`; UI is React Native (not a WebView of `miro-web`). Not the privacy vault (SecureStore BYOK + AsyncStorage sessions).

Full device URL notes: [`mobile.md`](./mobile.md).

```bash
pnpm --filter @miro/api
pnpm --filter miro-mobile start
```

Create `apps/miro-mobile/.env` (or set API URL in Settings):

```bash
EXPO_PUBLIC_MIRO_API_BASE_URL=http://localhost:8787
# Android emulator: http://10.0.2.2:8787
# Physical device: http://<LAN-IP>:8787
```

**Shipped on mobile:** streaming chat + Stop, multi-chat sessions, BYOK, provider/model discovery, Chat/Image modes, gallery, vision attach, light markdown, Markdown export, passphrase-encrypted backup (interop with web/desktop).

**Still vs web:** regenerate/edit, pin/rename polish.

See [`architecture-modularity.md`](./architecture-modularity.md) for package boundaries.

## Helpful scripts

From the repo root:

- `pnpm dev` — lean `@miro/api` + `miro-web` (port 3100); does **not** start Tauri
- `pnpm desktop:dev` — Tauri + starts `miro-web` via `beforeDevCommand`
- `pnpm desktop:release` — icons + API sidecar + static web + installers
- `pnpm typecheck` — typecheck packages and apps
- `pnpm desktop:build` — static export + Tauri installers (without icon/sidecar prep)
- `pnpm build` — production build (`@miro/api` + `miro-web`)

## Next steps

- [`getting-started.md`](./getting-started.md) — golden path (under 10 minutes)
- [`self-hosting.md`](./self-hosting.md) — lean `@miro/api`
- [`desktop.md`](./desktop.md) — Tauri packaging and distribution
- [`ROADMAP.md`](../ROADMAP.md) — v1 definition of done and phased plan
- [`CHANGELOG.md`](../CHANGELOG.md) — 0.2.0 release notes
- [`architecture.md`](./architecture.md) — apps, packages, and data flow
- [`stack.md`](./stack.md) — libraries and tooling
