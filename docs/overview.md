# Miro Documentation Overview

Miro is a modern, modular PWA for collaborative workspaces and generative AI workflows. The current V1 focuses on a **chat-first AI experience** that can talk and generate images in the same thread, backed by a configurable AI backend.

## Index

- [Stack](./stack.md)
- [Architecture](./architecture.md)
- [Usage](./usage.md)

## Customization & Roadmap

Miro is intentionally small and modular. V1 gives you a solid baseline you can extend:

- **AI capabilities** – add or swap providers and models via the `@miro/ai` package and the AI configuration in `apps/miro-api`.
- **Workspace model** – adapt the schema in `@miro/db` to your own domain (boards, documents, flows).
- **UI shell** – build richer layouts and components in your app clients, or add new main views such as an image workspace.
- **Integrations** – add third-party integrations to the API layer.

The roadmap beyond V1 can grow from this baseline (for example, dedicated image workspaces or richer activity views) without breaking the existing chat and settings flows described in these docs.
