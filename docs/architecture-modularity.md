# Architecture modularity

Assessment of the Miro monorepo as of the v1 pivot — what is modular today, what to improve, and how mobile fits.

## Summary

| Area | Modular? | Notes |
|------|:--------:|-------|
| API route registration | ✅ | Thin `register*Routes` modules per domain |
| `@miro/ai` provider layer | ⚠️ | Good boundary; only Google + mock wired |
| `miro-web` shell / UI split | ✅ | `shell/` vs `modules/ui/` is the right pattern |
| Shared packages | ⚠️ | `@miro/ui` unused by web; web doesn't use workspace packages |
| Cross-app contracts | ✅ (new) | `@miro/core` — types + API client for web/mobile/desktop |
| Mobile in workspace | ✅ (fixed) | Was orphaned; now in pnpm + Expo Router scaffold |
| Auth / DB packages | ⚠️ | Present for future SaaS; not on v1 client path |

**Verdict:** The repo is **modular at the folder level** but was **weak at package boundaries** until `@miro/core`. Customization is easy for UI and API routes; cross-platform sharing required a new shared package.

---

## Apps

```
apps/
├── miro-web/       Next.js PWA — primary UI today
├── miro-api/       Hono server — optional self-host / web demo backend
├── miro-desktop/   Tauri stub — v1 desktop target
└── miro-mobile/    Expo Router scaffold — v2 / freelancing surface
```

### `miro-web`

**Strengths**

- `app/shell/` — state, routing, data wiring (thin)
- `app/modules/ui/` — reusable presentation (model switcher, chat input, markdown)
- `app/settings/` — settings cards composed into a view
- `_settings-store.ts` — typed client settings with localStorage persistence

**Gaps**

- Does not import `@miro/ui` tokens or `@miro/core` API client (duplicated types/URLs)
- `useChat` targets `/api/chat` but there is no Next.js API route — relies on dev proxy or same-origin setup
- Chat sessions are not persisted (sidebar is partly decorative)

**Customization:** Add views in `shell/`, components in `modules/ui/`, settings cards in `settings/`.

### `miro-api`

**Strengths**

- `createApp()` composes route modules (`health`, `auth`, `me`, `ai`, `orgs`, `activity`)
- AI config centralized in `config.ts`; providers invoked via `@miro/ai`
- Env-driven deployment (`MIRO_AI_*`)

**Gaps**

- Settings UI documents more providers than `@miro/ai` implements
- Auth/DB routes load on every boot even for single-user BYOK desktop path

**Customization:** New providers in `packages/ai`; new routes as `registerFooRoutes({ app, ... })`.

### `miro-desktop`

Experimental Tauri shell. v1 should own keychain + encrypted SQLite; web UI embeds unchanged.

### `miro-mobile`

Expo Router scaffold (`app/` routes, `src/`). SecureStore BYOK, AsyncStorage sessions, and model discovery are present for experiments. **Not a v1 product surface** — desktop remains the shipping target.

---

## Packages

```
packages/
├── core/    Shared types + MiroApiClient (new)
├── ai/      Provider adapters (server-oriented)
├── ui/      Design tokens + shell config types
├── auth/    Better Auth — v1 client out of scope
└── db/      Drizzle / Postgres — v1 client out of scope
```

### `@miro/core` (new)

Platform-agnostic contracts:

- `ChatMessage`, `ApiUiMessage`, `AiConfigResponse`
- `MiroApiClient` — `fetchConfig()`, `streamChat()`, `completeChat()`
- `resolveMiroApiBaseUrl()` — `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*`

**Use from:** `miro-mobile` today; adopt in `miro-web` and Tauri next.

### `@miro/ai`

Server-side model factory + image client interfaces. Keep Node/AI SDK dependencies here — do not import from React Native.

### `@miro/ui`

CSS-oriented design tokens (colors, spacing, typography). Safe to import from React Native for colors/strings. Not a component library yet.

---

## Recommended boundaries

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  miro-web   │  │ miro-mobile │  │miro-desktop │
│  (Next.js)  │  │   (Expo)    │  │  (Tauri)    │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        ▼
                 ┌─────────────┐
                 │ @miro/core  │  types, API client, env
                 │ @miro/ui    │  tokens (optional)
                 └──────┬──────┘
                        ▼
                 ┌─────────────┐
                 │ @miro/api   │  optional HTTP layer
                 │ @miro/ai    │  provider adapters
                 └─────────────┘
```

**Rules**

1. **UI components stay per-platform** — do not share React DOM and React Native components.
2. **Share types and API clients** via `@miro/core`.
3. **Provider logic stays in `@miro/ai`** — only on server or Tauri Rust side for local bridges.
4. **Secrets** — OS keychain (desktop/mobile), never committed env files for user keys.

---

## Modularity improvements (ordered)

1. ✅ Add `@miro/core` and wire `miro-mobile`
2. ✅ Adopt `@miro/core` in `miro-web` (replace inline fetch URLs/types)
3. ✅ Add Next.js rewrite or explicit `NEXT_PUBLIC_MIRO_API_BASE_URL` for `/api/chat`
4. ✅ Extract settings types from `_settings-store.ts` into `@miro/core`
5. ✅ Lazy-load auth/DB in `@miro/api` when `MIRO_ENABLE_AUTH=false` for lean self-host
6. ✅ Tauri commands crate for encrypted SQLite (desktop v1 scaffold)

**All modularity checklist items for this phase are complete.**

---

## Mobile scaffold

```bash
# Terminal 1 — API
pnpm dev --filter @miro/api

# Terminal 2 — Expo
pnpm --filter miro-mobile start
```

Set `EXPO_PUBLIC_MIRO_API_BASE_URL` in `apps/miro-mobile/.env`:

```bash
# iOS simulator / web
EXPO_PUBLIC_MIRO_API_BASE_URL=http://localhost:8787

# Android emulator → host machine
EXPO_PUBLIC_MIRO_API_BASE_URL=http://10.0.2.2:8787
```

Routes:

- `app/index.tsx` — chat (uses `MiroApiClient`)
- `app/settings.tsx` — API URL hint, BYOK placeholder

See [`architecture.md`](./architecture.md) for full system diagram and v1 data flow.
