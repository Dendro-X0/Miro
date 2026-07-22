# Getting started (under 10 minutes)

Golden path: **install → add a key (or Ollama) → first chat**.

**Release:** [0.2.0](../CHANGELOG.md). Desktop is the privacy product (encrypted vault + OS keychain). The web PWA is for **demo and development** only — browser history is not end-to-end encrypted.

## 1. Install

```bash
# Node.js >= 20.19.0 and pnpm required
git clone <your-miro-fork-or-clone-url>
cd miro
pnpm install
```

For the desktop app you also need [Rust](https://rustup.rs/) and [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). Details: [`desktop.md`](./desktop.md).

## 2. Pick a provider

### Option A — OpenAI-compatible (cloud BYOK)

Works with OpenAI, OpenRouter, Groq, and any `/v1`-compatible endpoint.

Create a `.env` at the **repo root** (or export the same vars):

```bash
MIRO_AI_PROVIDER=openai-compatible
MIRO_AI_BASE_URL=https://api.openai.com/v1
MIRO_AI_API_KEY=sk-...
MIRO_AI_MODEL_BALANCED=gpt-4o-mini
MIRO_AI_IMAGE_MODEL=dall-e-3
```

You can also leave the server on `mock` and paste a key in **Settings → AI & keys** (BYOK). On desktop, that key is stored in the OS keychain. Use **Refresh models** to discover models; set **API base URL** for OpenRouter/Groq/etc.

### Option B — Ollama (local, no API key)

1. Install [Ollama](https://ollama.com/) and pull a model, e.g. `ollama pull llama3.2`.
2. Configure:

```bash
MIRO_AI_PROVIDER=local
MIRO_AI_BASE_URL=http://127.0.0.1:11434/v1
MIRO_AI_MODEL_BALANCED=llama3.2
```

Ollama is **text-only** in v1. For images, use OpenAI-compatible or Google Imagen (see [`usage.md`](./usage.md)).

### Option C — Anthropic

```bash
MIRO_AI_PROVIDER=anthropic
MIRO_AI_ANTHROPIC_API_KEY=sk-ant-...
# or paste the key as BYOK in Settings
```

### Option D — Mock (no key, try the UI)

```bash
MIRO_AI_PROVIDER=mock
```

## 3. Run

### Desktop (recommended)

```bash
pnpm desktop:dev
```

Debug builds spawn lean `@miro/api` on `:8787` by default. Chat, pin sessions, and generate images; history and gallery use the encrypted vault.

Release installer (unsigned): `pnpm desktop:release` — see [`desktop.md`](./desktop.md).

### Web PWA (demo / dev)

```bash
pnpm dev   # @miro/api :8787 + miro-web :3100
```

Open **http://localhost:3100**.

## 4. First chat checklist

1. Open **Settings → AI & keys** — paste BYOK if needed, set base URL for gateways, **Refresh models**, pick a model.
2. Back in **Chat**, send a short message — you should see streaming tokens.
3. (Optional) Paperclip → attach an image (vision-capable providers); or Assistant mode → **Image** → generate; open **Gallery**.
4. (Optional) Export Markdown from the chat header, or encrypted backup from Settings → Data.
5. Confirm history: new chats appear in the sidebar (desktop = encrypted vault).

## Which surface should I use?

| Goal | Use |
|------|-----|
| Private daily driver | **Desktop** (`pnpm desktop:dev` / `desktop:release`) |
| UI development / quick demo | **Web PWA** (`pnpm dev` → :3100) |
| Headless / scripted API | **Lean `@miro/api`** — [`self-hosting.md`](./self-hosting.md) |
| Phone client | **Native Expo** (next version) — [`mobile.md`](./mobile.md) |

## Next

- Providers & env reference: [`usage.md`](./usage.md)
- Desktop packaging & signing: [`desktop.md`](./desktop.md)
- Self-host the API: [`self-hosting.md`](./self-hosting.md)
- Scope & anti-goals: [`../ROADMAP.md`](../ROADMAP.md)
- Release notes: [`../CHANGELOG.md`](../CHANGELOG.md)
