# Miro Workspace

Miro is a **PWA-first AI workspace** for chat and image generation that you can run locally, fork, and extend.

The current **public V1 (beta)** release ships a web PWA plus a small AI backend that you configure with environment variables. Desktop and mobile shells are experimental and part of the roadmap, not required for V1.

![Project Thumbnail](apps/miro-web/public/chat_1.png)
![Lighthouse](apps/miro-web/public/lighthouse.png)

---

## Quick start

1. Install Node.js `>= 20.19.0` and [pnpm](https://pnpm.io/).
2. From the `miro/` root, install dependencies:

   ```bash
   pnpm install
   ```

3. Follow [`docs/usage.md`](./docs/usage.md) to configure AI environment variables and run:

   ```bash
   pnpm dev --filter @miro/api
   pnpm dev --filter miro-web
   ```

   Then open `http://localhost:3000` and use Miro in your browser or install it as a PWA.

---

## Docs

Most details now live under [`docs/`](./docs):

- [`overview.md`](./docs/overview.md) – what Miro is and how to extend it.
- [`usage.md`](./docs/usage.md) – local setup, environment, and development workflow.
- [`stack.md`](./docs/stack.md) – libraries and tooling used across the monorepo.
- [`architecture.md`](./docs/architecture.md) – apps, packages, and data/control flow.

Release notes and roadmap:

- [`CHANGELOG.md`](./CHANGELOG.md) – notable changes across public releases.
- [`ROADMAP.md`](./ROADMAP.md) – planned work beyond the current PWA-first beta.

---

## V1 scope

- **Supported surface:** web PWA (`apps/miro-web`) plus AI API (`apps/miro-api`).
- **Experimental:** desktop (`apps/miro-desktop`) and mobile (`apps/miro-mobile`) shells are not required for V1 and may change.

---

## License

This repository does **not** currently declare an open-source license. Before publishing publicly, add a `LICENSE` file (for example MIT or Apache-2.0) that matches how you intend others to use this code.
