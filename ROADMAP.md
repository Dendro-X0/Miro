# Roadmap

This document describes what is in the **current public V1 (beta)** and what is planned for future iterations.

## Status: V1 (public beta)

The first public release focuses on:

- **PWA-first experience** via `apps/miro-web`.
- **AI backend** via `apps/miro-api` with configurable providers/models.
- Installable app on desktop and mobile via the browser (PWA install / Add to Home Screen).

Native shells (`miro-desktop`, `miro-mobile`) are **experimental** and not required for V1.

## Near term (V1.x)

- **PWA hardening and deployment**
  - Smooth deployment to Vercel or another host.
  - Clear configuration for `NEXT_PUBLIC_MIRO_API_BASE_URL` and AI env vars.
- **Image workflows**
  - Iterate on the image generation UX, potentially adding a dedicated image workspace view.
- **Docs and examples**
  - Expand configuration examples for different AI providers.
  - Provide small customization examples (theming, prompts, workspace naming).

## Medium term (V2+)

- **Desktop (Tauri)**
  - Stabilize `apps/miro-desktop` against the latest Tauri 2 toolchain.
  - Provide a documented, reproducible setup for Windows/macOS/Linux.
- **Mobile (Expo / native)**
  - Decide whether to continue with Expo for a native shell or lean fully on the PWA for mobile.
  - If continued, sync navigation and settings with the web client.
- **Workspace features**
  - Turn the placeholder views (projects, activity) into real data-backed screens.
  - Add basic persistence for conversation history and workspace entities.
- **Auth and multi-tenant workspace model**
  - Wire `@miro/auth` and `@miro/db` into the running app.
  - Support multi-tenant workspaces, memberships, and activity feeds.

This roadmap is intentionally high-level. The actual sequence may change as the project evolves, but the guiding principle is **PWA-first**, with desktop and mobile shells arriving once the web + API surface is stable.
