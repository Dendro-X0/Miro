# PWA deploy (demo / OSS discovery)

The **web PWA** (`apps/miro-web`) is the **demo and development** surface. Desktop owns encrypted vault + keychain. Do not market the PWA as E2EE.

## What you get

- Chat, settings, Gallery (browser `localStorage`), model discovery against a reachable `@miro/api`
- No OS keychain; no ChaCha vault — suitable for try-before-desktop

## Prerequisites

- Node.js >= 20.19, pnpm
- A lean API with BYOK env or users’ browser-entered keys calling your API host

## Option A — Vercel (static export)

`miro-web` uses Next `output: 'export'` for desktop; the same static `out/` can be hosted.

```bash
pnpm --filter miro-web build
# artifacts: apps/miro-web/out
```

1. Create a Vercel project with root `apps/miro-web` **or** upload `out/` as a static site.
2. Set the browser API base to your public `@miro/api` (CORS must allow the PWA origin).
3. Do **not** put production secrets in the static bundle; keys stay BYOK in the client → your API.

Example env for the **API** service (separate host):

```bash
MIRO_AI_PROVIDER=openai
MIRO_AI_API_KEY=          # optional server fallback; prefer BYOK from client
MIRO_ENABLE_AUTH=false
```

Point the web app at the API via your existing client base URL config (see [`usage.md`](./usage.md)).

## Option B — Any static host

Upload `apps/miro-web/out` to Netlify, Cloudflare Pages, S3+CDN, or GitHub Pages. Same CORS/API rules as Vercel.

## API beside the PWA

Self-host lean API: [`self-hosting.md`](./self-hosting.md). For local demo:

```bash
pnpm --filter @miro/api dev
pnpm --filter miro-web dev
```

## Checklist before sharing a public demo

| Check | Why |
|-------|-----|
| HTTPS on the PWA | Secure context for mic / modern APIs |
| CORS allows PWA origin on API | Chat/image will fail silently otherwise |
| Privacy copy | State clearly: not the encrypted desktop product |
| Rate limits on API | Public demos get abused |

## Related

- Desktop primary product: [`desktop.md`](./desktop.md)  
- Milestone 0.3b: [`milestone-0.3.md`](./milestone-0.3.md) · sidecar: [`sidecar-strategy.md`](./sidecar-strategy.md)
