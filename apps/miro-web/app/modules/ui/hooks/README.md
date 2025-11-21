# UI Hooks

This directory contains reusable front-end hooks for the `apps/miro-web` UI.

Hooks here should:
- Be presentation-focused (UI state, viewport, interactions), not business logic.
- Be fully typed (no `any`).
- Use RO-RO (Receive Object, Return Object) for complex parameters.

Example future hooks:
- `useModelSwitcherState`
- `useScrollShadow`
