# Desktop (Tauri)

Miro’s primary product surface is **`apps/miro-desktop`** — a Tauri v2 shell around the same UI as `miro-web`, with:

- Encrypted SQLite chat vault (ChaCha20-Poly1305)
- OS keychain for BYOK secrets
- Lean `@miro/api` spawned by default (bundled sidecar in release builds)

**Release:** [0.2.0](../CHANGELOG.md). Web PWA remains the demo/dev surface; desktop owns the privacy story. New users: start with [`getting-started.md`](./getting-started.md).

## Prerequisites

- Node.js >= 20.19.0, pnpm
- [Rust](https://rustup.rs/) (stable) + platform Tauri deps
  - Windows: [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (usually preinstalled)
  - macOS: Xcode CLT
  - Linux: see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
- For chat: lean API reachable at `http://127.0.0.1:8787` (auto-spawned in debug)

## Dev

From the repo root:

```bash
# Optional: start API yourself if you disable spawn
pnpm dev --filter @miro/api

# Tauri + Next on :3100 (API spawn on by default in debug)
pnpm desktop:dev
```

| Env | Effect |
|-----|--------|
| `MIRO_DESKTOP_SPAWN_API=0` | Never spawn; start API yourself |
| (unset) | Spawn enabled (bundled sidecar, then pnpm, then node+tsx fallbacks) |

Desktop UI talks to the API with an **absolute** base URL (`NEXT_PUBLIC_MIRO_API_BASE_URL`, default `http://127.0.0.1:8787`). Next rewrites are not used inside the Tauri webview.

## Production build (unsigned)

```bash
pnpm desktop:release   # icon + API sidecar + static web + Tauri installer
# or step by step:
pnpm desktop:icon
pnpm --filter miro-desktop build:sidecar
pnpm desktop:build
```

`MIRO_DESKTOP_BUILD=1` enables Next `output: 'export'`, `images.unoptimized`, and `NEXT_PUBLIC_MIRO_DESKTOP=1` (disables PWA service worker; uses absolute API URLs).

Artifacts land under `apps/miro-desktop/src-tauri/target/release/bundle/` (NSIS/MSI on Windows, DMG/app on macOS, deb/rpm/AppImage on Linux).

### Release checklist

| Step | What to verify |
|------|----------------|
| 1. Sidecar | `apps/miro-desktop/src-tauri/resources/miro-api/index.mjs` exists after `build:sidecar` |
| 2. Static UI | `apps/miro-web/out/index.html` exists after web export |
| 3. Bundle | Installer appears under `src-tauri/target/release/bundle/` |
| 4. Fresh install | Open app → vault unlocks → API health on `:8787` → one chat turn |
| 5. Keys | Set BYOK in Settings; quit/relaunch; key still in OS keychain |
| 6. Offline API | Quit app; confirm sidecar process exits (no orphan Node) |
| 7. Node missing | Remove Node from PATH → clear `[miro-desktop]` spawn failure log |
| 8. Projects (0.3a) | Create project → new chat scoped → switch Inbox |
| 9. Image continuity (0.3a) | Chat on cloud provider; ComfyUI image still works |

### Release + API

Desktop spawns the lean API on launch (bundled sidecar in release builds). Requires **Node.js on PATH** for the sidecar process until SEA lands — see [`sidecar-strategy.md`](./sidecar-strategy.md). Set `MIRO_DESKTOP_SPAWN_API=0` to run your own API instance.

**Known packaging gaps (intentional for Milestone 0.3):**

- Sidecar is ESM Node, not a single static binary — end users need Node on PATH
- Installers are unsigned by default (SmartScreen / Gatekeeper warnings expected)
- No auto-updater wired yet

**Follow-up:** Node SEA (or equivalent) single executable; optional signed CI artifacts.

PWA demo hosting (not E2EE): [`pwa-deploy.md`](./pwa-deploy.md).

## Signing (optional)

Unsigned builds are enough for local use and OSS contributors. Store / SmartScreen / Gatekeeper need platform certs:

| Platform | Typical path |
|----------|----------------|
| Windows | Authenticode cert + `tauri.conf` / CI secrets for `windows.certificateThumbprint` |
| macOS | Apple Developer ID + notarization |
| Linux | Often unsigned; optional GPG for package repos |

Coffee-price Gumroad (or similar) distribution can ship **pre-signed** binaries while MIT source stays free. Signing is **not** required to mark Milestone 0.3b complete.

## Icons

```bash
pnpm desktop:icon
```

Writes `apps/miro-desktop/src-tauri/icons/*` from the web SVG.

## Cold start / memory

Profile with CodaCtrl (or OS tools) against a release build. Targets from the roadmap: snappy cold start and modest idle RAM — no Chromium/Python/CUDA stack in the installer.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Chat fails / network error | Is `@miro/api` on `:8787`? `curl http://127.0.0.1:8787/health` |
| Blank window after build | Confirm `apps/miro-web/out` exists; `frontendDist` must be `../miro-web/out` |
| `pnpm` spawn fails | Install pnpm on PATH, or set `MIRO_DESKTOP_SPAWN_API=0` and start API manually |
| Sidecar / `node` not found | Install [Node.js 20+](https://nodejs.org/); see `[miro-desktop]` logs. Or disable spawn — [`sidecar-strategy.md`](./sidecar-strategy.md) |
| Keychain errors | OS credential store permissions; first-run may prompt |

See also [`usage.md`](./usage.md) for AI env vars and [`architecture-modularity.md`](./architecture-modularity.md) for package boundaries.
