# Architecture modularity

Assessment of the Miro monorepo as of **0.2.0** + native Expo Milestones 1–3.

## Summary

| Area | Modular? | Notes |
|------|:--------:|-------|
| API route registration | ✅ | Thin `register*Routes` modules per domain |
| `@miro/ai` provider layer | ✅ | OpenAI-compatible, Google, Anthropic, local, mock |
| `miro-web` shell / UI split | ✅ | `shell/` vs `modules/ui/` |
| Shared packages | ✅ | `@miro/core` shared by web, mobile, desktop UI |
| Cross-app contracts | ✅ | Types, API client, backup crypto, message parts, Markdown export |
| Mobile in workspace | ✅ | Native Expo (not WebView); next-version product track |
| Auth / DB packages | ⚠️ | Present for future SaaS; lean API skips them by default |

**Verdict:** Package boundaries are healthy. Customization is easy for UI and API routes; cross-platform sharing goes through `@miro/core`.

---

## Apps

```
apps/
├── miro-web/       Next.js PWA — demo/dev + embedded desktop UI
├── miro-api/       Hono lean sidecar — BYOK / Ollama / self-host
├── miro-desktop/   Tauri v2 — primary privacy product (vault + keychain)
└── miro-mobile/    Native Expo — next-version track (SecureStore / AsyncStorage)
```

### `miro-web`

**Strengths**

- `app/shell/` — state, routing, data wiring
- `app/modules/ui/` — presentation components
- `app/settings/` — composed settings cards
- Uses `@miro/core` for API client, settings types, backup crypto, message parts

**Gaps**

- Browser storage is localStorage (not E2EE) — desktop owns the privacy vault
- Multi-tab write races remain a demo-surface limitation

**Customization:** Add views in `shell/`, components in `modules/ui/`, settings cards in `settings/`.

### `miro-api`

**Strengths**

- `createApp()` composes route modules; lean mode skips auth/DB
- AI config centralized; providers via `@miro/ai`
- Chat path rate-limits and truncates history (32 messages)

**Customization:** New providers in `packages/ai`; new routes as `registerFooRoutes({ app, ... })`.

### `miro-desktop`

Shipped Tauri shell: OS keychain BYOK, encrypted SQLite vault, backup import/export, packaging via `pnpm desktop:release`. See [`desktop.md`](./desktop.md).

### `miro-mobile`

Native Expo Router client. Shares `@miro/core`; SecureStore BYOK; AsyncStorage sessions/gallery; streaming chat; image mode; vision; Markdown share; passphrase backup. **Next-version track** — desktop remains the privacy product. See [`mobile.md`](./mobile.md).

Important: Miro API URL (`apiBaseUrl`) is separate from optional provider gateway URL (`byokBaseUrl`).

---

## Packages

```
packages/
├── core/    Shared types + MiroApiClient + backup/message/export helpers
├── ai/      Provider adapters (server-oriented)
├── ui/      Design tokens (mobile; web has local modules)
├── auth/    Better Auth — not on default lean client path
└── db/      Drizzle — not on default lean client path
```

### `@miro/core` (shared contract)

- `MiroApiClient` — config, models, chat stream, image
- `miro:parts` serialize/deserialize for vision
- Passphrase backup: PBKDF2 (120k) + AES-GCM (`miro-backup-v1`)
- `formatChatMarkdown` / `chatExportFilename`

Tests: `packages/core/test/core-lib.test.ts`

---

## Data flow (simplified)

```
miro-web / miro-mobile / miro-desktop(UI)
        │
        ▼  HTTP
miro-api ──► @miro/ai ──► providers
        │
miro-desktop vault (ChaCha20-Poly1305 at rest)
```

Portable backups (`.mirobackup.json`) use `@miro/core` crypto so web ↔ desktop ↔ mobile can interchange chats + gallery (BYOK keys are never included).

---

## What not to rebuild

- Do not embed Next.js/Tailwind web UI in Expo (WebView path rejected)
- Do not duplicate backup crypto per app — keep it in `@miro/core`
- Do not treat mobile AsyncStorage as an encrypted vault substitute
