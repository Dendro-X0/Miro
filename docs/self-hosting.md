# Self-hosting `@miro/api`

Optional. Most users run the API only as a local companion to the web PWA or desktop shell. You do **not** need Postgres, Docker, or auth for the default BYOK path.

## Lean mode (default)

Unset or `MIRO_ENABLE_AUTH=false`:

- Serves AI + health only
- No Postgres / Better Auth import
- Suitable for single-user desktop and web demo

```bash
pnpm install
# set MIRO_AI_* as in docs/getting-started.md
pnpm dev --filter @miro/api
# → http://127.0.0.1:8787
```

### Health check

```bash
curl http://127.0.0.1:8787/health
# { "mode": "lean", "auth": false, "db": false, ... }
```

### Useful routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness + mode |
| `GET` | `/ai/config` | Provider / model runtime for the UI |
| `POST` | `/ai/models` | Live model discovery (BYOK / env / Ollama) |
| `POST` | `/api/chat` | Streaming chat (AI SDK UI message stream) |
| `POST` | `/v2/ai/image` | Image generation (OpenAI-compatible / Google / mock) |

Chat and image bodies accept `provider`, `byokKey`, `model`, and optional `baseUrl` so the client can BYOK without putting secrets in the process env.

### CORS

Lean API enables permissive CORS for local clients. Desktop and static web builds call `http://127.0.0.1:8787` directly. The Next.js web app in non-desktop mode proxies via rewrites (see [`usage.md`](./usage.md)).

## Production-ish process

```bash
pnpm --filter @miro/api build   # if the package defines a build
pnpm --filter @miro/api start   # or: node path-to-entry
```

Bind with your process manager (systemd, Docker, etc.). Keep `MIRO_ENABLE_AUTH` off unless you intentionally enable full mode.

Recommended env for a private VPS (still single-user):

```bash
MIRO_ENABLE_AUTH=false
MIRO_AI_PROVIDER=openai-compatible
MIRO_AI_BASE_URL=https://api.openai.com/v1
MIRO_AI_API_KEY=sk-...          # or rely on client BYOK only
PORT=8787                       # if supported by your start script
```

Prefer **client BYOK** over a shared server key when multiple people might reach the host.

## Full mode (optional experiments)

```bash
MIRO_ENABLE_AUTH=true
DATABASE_URL=postgres://...
```

Loads `@miro/db` + `@miro/auth` and multi-user routes. **Not part of the v1 product story** — Miro v1 is a single-user client, not multi-tenant SaaS. Use full mode only if you are extending the monorepo yourself.

## Desktop release builds

Unsigned / release desktop apps do **not** auto-spawn the Node API. Run lean `@miro/api` beside the app, or ship a sidecar later. See [`desktop.md`](./desktop.md).

## What not to expect

- No RAG index, agent runtime, or multi-tenant billing in lean mode
- No bundled ComfyUI / CUDA stacks
- Mobile (`miro-mobile`) is an Expo scaffold — not a self-host target for v1

## Related

- Golden path: [`getting-started.md`](./getting-started.md)
- Env & providers: [`usage.md`](./usage.md)
- Architecture: [`architecture.md`](./architecture.md)
