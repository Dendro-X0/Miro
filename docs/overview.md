# Miro Documentation Overview

Miro is a **private, local-first BYOK AI studio** — a modular client for text and image workflows. Users bring their own API keys or connect to local models; on desktop, keys and chat history stay in the OS keychain and an encrypted vault.

**Release:** [0.2.0](../CHANGELOG.md) · **Start here:** [`getting-started.md`](./getting-started.md) (install → key → first chat, under 10 minutes).

## Index

| Doc | Purpose |
|-----|---------|
| [Getting started](./getting-started.md) | Golden path |
| [Usage](./usage.md) | Env, providers, model discovery, scripts |
| [Desktop](./desktop.md) | Tauri packaging & release checklist |
| [Self-hosting](./self-hosting.md) | Lean `@miro/api` |
| [Stack](./stack.md) | Libraries |
| [Architecture](./architecture.md) | Apps & data flow |
| [Architecture modularity](./architecture-modularity.md) | Package boundaries |

## Surfaces

| Surface | Role |
|---------|------|
| **Desktop** (`miro-desktop`) | Primary product — encrypted vault, keychain, API sidecar |
| **Web PWA** (`miro-web`) | Demo and UI development — not E2EE |
| **API** (`@miro/api`) | Lean local AI HTTP; chat, image, model list; optional self-host |
| **Mobile** (`miro-mobile`) | Expo scaffold only — not a v1 product (deferred) |

## What Miro is not

Miro is intentionally small. v1 does **not** target RAG, multi-user SaaS, agents, or mobile as a product. It integrates with tools like Ollama (and later ComfyUI) via APIs rather than rebuilding them. See the honesty table in [`../README.md`](../README.md).

## Customization

- **AI providers / discovery** — adapters in `@miro/ai`; routes in `apps/miro-api` (`/ai/config`, `/ai/models`, chat, image)
- **UI shell** — views in `app/modules/ui`, wiring in `app/shell/`
- **Desktop** — vault / keychain / spawn in `apps/miro-desktop`
- **Self-hosting** — lean `@miro/api` with `MIRO_AI_*` — [`self-hosting.md`](./self-hosting.md)

See [`ROADMAP.md`](../ROADMAP.md) for v1 scope, anti-goals, and future tiers. See [`CHANGELOG.md`](../CHANGELOG.md) for 0.2.0 notes.
