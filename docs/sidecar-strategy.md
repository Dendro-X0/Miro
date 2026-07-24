# Design: Desktop API sidecar / Node-less UX (0.3b)

**Status:** approved for implementation  
**Owner:** `apps/miro-desktop` spawn + packaging docs  
**Milestone:** [`docs/milestone-0.3.md`](../docs/milestone-0.3.md)

## Current state

- Release builds bundle `resources/miro-api/index.mjs` (esbuild ESM for Node 20).
- Spawn order: bundled sidecar → pnpm → `node`+tsx (`api_process.rs`).
- **Gap:** end users need **Node.js on PATH** to run the sidecar.

## Decision (0.3b)

| Phase | Choice | Rationale |
|-------|--------|-----------|
| **0.3b near-term** | Keep ESM sidecar; add **clear failure UX + docs** when Node is missing; expand smoke checklist; publish PWA deploy guide; document optional signing | Small installer; no multi-hundred-MB Node embed yet |
| **0.3.x follow-up** | **Node SEA** (or equivalent) single executable wrapping the lean API | True Node-free PATH; still no Python/CUDA |

**Rejected for 0.3:** shipping a full Node runtime tree inside the installer (size / licensing complexity vs thesis “under ~50 MB”).

## Near-term implementation

1. Detect spawn failure (Node not found) → surface a one-time desktop-visible log / future toast; document in `desktop.md` Troubleshooting.  
2. Expand release smoke checklist (Projects optional; health; sidecar exit).  
3. Signing section already present — keep honest “unsigned by default”.  
4. New [`docs/pwa-deploy.md`](./pwa-deploy.md) for Vercel/static demo host.

## Proof

- L1: docs exist; smoke table lists Windows primary  
- L2: `pnpm --filter miro-desktop build:sidecar` produces `index.mjs`  
- L3: manual Windows smoke before 0.3.0 cut (checklist signed off in CHANGELOG notes)

## Non-goals

App Store submission; changing privacy story away from desktop vault.
