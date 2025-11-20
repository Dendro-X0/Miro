# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- Clarified that the **public V1 is PWA-first**; desktop (Tauri) and mobile (Expo) are experimental and part of the roadmap.
- Updated docs to use the correct workspace name for the API package (`@miro/api`).
- Added `ROADMAP.md` and `CHANGELOG.md` to track future plans and changes.

## [0.1.0] – Public beta

Initial public (beta) release of Miro Workspace:

- **Chat-first PWA** (`apps/miro-web`) with multi-chat sidebar, pinned chats, rename, and responsive layout.
- **Unified text and image chat** with `/v2/ai/chat` and `/v2/ai/image` backed by `apps/miro-api`.
- **AI & keys settings** allowing provider selection, model presets (text and image), custom model IDs, and BYOK stored locally.
- **Env-driven AI backend** using `MIRO_AI_*` env vars with support for mock, OpenAI-compatible, Anthropic, Google, and local providers.
- Monorepo structure with shared packages for AI, auth, DB, and UI utilities.
