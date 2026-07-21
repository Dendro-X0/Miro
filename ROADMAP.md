# Roadmap

Miro is a **private, local-first BYOK AI studio** — a fast, encrypted client for text and image workflows. It is not a SaaS boilerplate or an Open WebUI competitor.

**Positioning:** small installer, encrypted vault, modular providers. Users bring their own API keys or connect to local models (Ollama). Optional coffee-price desktop builds; core remains open source.

---

## Product thesis

> A beautiful, encrypted BYOK studio for people who don't want Docker, bloat, or platform lock-in.

**Differentiators**

- **Performance** — lean web UI, Tauri desktop, profiling with CodaCtrl where needed
- **Privacy** — API keys in OS keychain; chats and generated media encrypted at rest
- **Size** — desktop installers target **under ~50 MB** (no bundled Python/CUDA/Chromium stack)
- **Modularity** — thin provider adapters; optional localhost bridges (Ollama, ComfyUI)

**Anti-goals for v1**

- No multi-user, RBAC, or team SaaS
- No RAG, agents, or plugin marketplace
- No mobile app (defer; Expo only if v2+ and freelancing needs justify it)
- No video generation in v1
- No rebuilding ComfyUI or Stable Diffusion — integrate via API only
- No "Miro Pro" enterprise boilerplate in a separate repo (archived intent)

---

## Current status (0.2.0)

Shipped for the desktop-first v1 band:

- ✅ Chat-first PWA with model switcher, assistant modes, responsive shell
- ✅ Real-time text streaming (Vercel AI SDK)
- ✅ Markdown rendering with syntax-highlighted code blocks
- ✅ Settings UI for providers, BYOK, optional API base URL, system prompts
- ✅ Dynamic model discovery (`POST /ai/models`) for OpenAI-compatible, Anthropic, Google, Ollama
- ✅ Monorepo layout: `miro-web`, `miro-api`, `miro-desktop`, shared packages
- ✅ Chat history: encrypted vault (desktop) / localStorage (web); pin / rename / auto-title
- ✅ Desktop: Tauri packaging + API sidecar (`pnpm desktop:dev` / `desktop:release`) — [`docs/desktop.md`](./docs/desktop.md)
- ✅ Image generation: OpenAI-compatible + Google Imagen; Gallery; ComfyUI deferred
- ✅ Anthropic text; vision attach; regenerate/edit; Markdown export; encrypted backup
- 🚧 Mobile: Expo scaffold only (not a v1 product)

---

## v1 — Private BYOK studio (current focus)

**Goal:** A tool you'd open weekly — desktop-first, web for demo/dev, shippable in ~2–4 focused weeks.

**Definition of done**

1. Desktop Tauri app installs and runs on Windows, macOS, Linux
2. Web PWA works for development and browser-based use
3. BYOK works for **one cloud path** (OpenAI-compatible) **and one local path** (Ollama)
4. Chat history persists in an **encrypted local database**
5. Golden-path setup documented in **under 10 minutes** — [`docs/getting-started.md`](./docs/getting-started.md)
6. Installer stays **under ~50 MB**; no Docker required for default use

### Phase 1 — Golden path (text)

- [x] **Provider adapters**
  - OpenAI-compatible API (OpenAI, OpenRouter, Groq, etc.)
  - Ollama via localhost (`MIRO_AI_PROVIDER=local`)
  - Align `@miro/ai` with settings UI (`openai-compatible`, `local`, `google`)
- [x] **Encrypted local storage**
  - Desktop: ChaCha20-Poly1305 + SQLite vault; BYOK in OS keychain
  - Web: local chat history in the browser (opt-out via Settings → Data)
  - Pin / rename / auto-title sessions
- [x] **Chat UX**
  - Sidebar session list backed by real persistence
  - Mobile sidebar for chats
  - Streaming, markdown, error states (existing UI)

### Phase 2 — Tauri desktop

- [x] **Desktop shell**
  - Embed `miro-web` UI in Tauri v2 (dev URL + static `out/` export for release)
  - Encrypted vault + OS keychain for storage/crypto; lean `@miro/api` spawned by default (bundled sidecar in release)
  - Cold-start / idle memory: profile with CodaCtrl on release builds (ongoing)
- [x] **Distribution packaging**
  - Unsigned Win / macOS / Linux bundle targets (NSIS, DMG, deb/rpm/AppImage) via `pnpm desktop:build`
  - Signing + coffee-price prebuilts documented as optional; MIT source stays free — see [`docs/desktop.md`](./docs/desktop.md)

### Phase 3 — Image (v1 path chosen)

**v1 ships Option A.** ComfyUI bridge deferred to v1.x.

- [x] **Option A — API image generation**
  - OpenAI-compatible `/images/generations` (DALL·E / gpt-image) + Google Imagen
  - Display in-thread; save to encrypted desktop vault gallery (web: localStorage gallery)
- [ ] **Option B — ComfyUI localhost bridge** (v1.x)
  - Submit presets to local ComfyUI HTTP API (txt2img / img2img)
  - No node graph — curated workflows only

### Phase 4 — Ship

- [x] **Documentation**
  - Golden path: [`docs/getting-started.md`](./docs/getting-started.md) (install → add key → first chat)
  - Provider setup (OpenAI-compatible + Ollama) in getting-started + [`docs/usage.md`](./docs/usage.md)
  - Self-hosting notes: [`docs/self-hosting.md`](./docs/self-hosting.md)
- [x] **Web PWA**
  - Documented as demo/dev surface; desktop carries the privacy story (README, overview, getting-started)
- [x] **Competitive honesty**
  - README “What Miro is not” table (not RAG, not multi-user SaaS, not mobile v1, not ComfyUI suite)

### Phase complete — v1 docs band

Phases 1–4 checklist items above are done for the current v1 band. Remaining work lives under **v1.x** / **v2**.

## v1.x — Refinement (after v1 ships)

Only after the definition-of-done checklist is complete:

- [ ] Second image path (API + ComfyUI if v1 shipped with only one)
- [x] Additional providers (Anthropic) with thin adapters; Google text already in golden path
- [ ] **Projects** — encrypted folders grouping chats + assets + one ComfyUI preset
- [x] Export conversations (Markdown)
- [x] System prompt / per-chat instructions
- [x] Vision (image attach in chat for supported providers)
- [x] Regenerate / edit last turn
- [x] Encrypted backup export/import
- [ ] Production PWA deploy guide (Vercel or static host)

---

## v2 — Optional expansion

Gated on v1 usage and maintenance cost (target: **< 2 hrs/month** to keep alive):

- [ ] Video generation tab (async jobs, webhook-style providers — Runway, Fal, etc.)
- [ ] Expo mobile client (shared types/API only; not Tauri mobile) — BYOK SecureStore + sessions + model discovery started
- [ ] Optional zero-knowledge sync (encrypted backup export/import — basic passphrase backup shipped in v1.x)
- [ ] Prompt template library
- [ ] Plugin-style provider modules

---

## Architecture (target)

```
miro-web (Next.js)     — UI modules, settings, chat shell
        │
        ▼ embeds
miro-desktop (Tauri v2) — keychain, encrypted SQLite, perf
        │
        ▼
packages/ai             — thin provider adapters
packages/crypto (new)   — E2EE vault primitives (optional extract from E2EE apps)
miro-api (Hono)         — optional self-host; env-driven config for web demo
```

**Platforms**

| Surface | v1 | Notes |
|---------|:--:|-------|
| Tauri desktop | ✅ | Primary product |
| Web PWA | ✅ | Demo, dev, OSS discovery |
| Mobile | ❌ | Defer; Tauri mobile immature; Expo if v2+ |

---

## Development principles

1. **Finish v1 before expanding** — one golden path beats a long feature list
2. **Integrate, don't rebuild** — ComfyUI, Ollama, cloud APIs as sidecars
3. **Encrypt by default** — keys and history are security features, not marketing
4. **Stay small** — if the installer or idle RAM grows without reason, treat it as a bug
5. **Maintainability** — scope small enough that abandonment isn't the default outcome

---

## Current priority

**0.2.0 cuts the scoped v1 band** (Phases 1–4 + Tier 1/2 polish listed above).

Shipped: golden-path providers (incl. Anthropic), encrypted desktop vault, Tauri release packaging, API images + Gallery, model discovery, vision, backup, ship docs.

**Next (only if used weekly):** ComfyUI bridge, production PWA deploy notes, signed installers, or Node-free API sidecar.

*Mobile stays deferred. Everything else waits until maintenance cost stays under ~2 hrs/month.*
