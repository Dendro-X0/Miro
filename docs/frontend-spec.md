# Frontend Spec — Miro

## Meta

- **Product:** Miro — private, local-first BYOK AI studio
- **Audience:** Solo users bringing their own API keys or local models
- **Reference tier:** Studio tool (dense, connection-first settings)
- **Stack:** Next.js App Router (miro-web), Tauri desktop shell, Tailwind, TypeScript
- **Spec status:** approved (AI & keys redesign; Sidebar studio rail; product surfaces map)
- **API dependency:** `GET`/`fetchConfig` → `AiRuntimeConfig`; `POST /ai/models` (`listModels`) with `provider`, optional `byokKey`, optional `baseUrl`
- **Product map:** [`product-surfaces.md`](./product-surfaces.md) — Chat / Gallery / Activity roles, ship vs gap, anti-goals

---

## Shell: Sidebar (studio rail)

### Purpose

Primary navigation and session browser for Miro Studio — a BYOK AI workspace for text and image workflows. The sidebar is a **studio rail**, not a chat widget with marketing tips.

### Zones (top → bottom)

1. **Brand** — workspace mark + name (`profile.workspaceName`).
2. **Primary modes** — Chat / Gallery / Activity as equal peers. Selection via soft fill + border only; **no “Active” badge**.
3. **Contextual middle** (`flex-1 min-h-0 overflow-y-auto`) — swaps with the active mode:
   - **Chat:** Recent chats header, New, search, session list (pin / rename / delete).
   - **Gallery:** asset count or empty CTA (“Generate images from Chat”).
   - **Activity:** recent sessions + gallery thumbs (see Activity page below); sidebar shows a short “Recent” summary.
4. **Utility footer** — Settings as a quieter row; history/status strip (encrypted / browser / history off). Optional provider-ready cue when wired.

### Selection & accessibility

- Mode buttons use `aria-current="page"` when selected.
- Chat list search and overflow menus unchanged in behavior.
- Focus rings use existing sky ring tokens.

### Coaching / tips

- **Not** in the sidebar. Empty-chat coaching (example prompts + Shift+Enter hint) lives in the main Chat empty state (`ChatHero` / `SampleMessages`).

### Wiring

| Prop | Source |
|------|--------|
| `view` / `onChangeView` | App shell main view |
| `chats` / session actions | Vault / history sessions |
| `galleryCount` | `galleryAssets.length` |
| `historyHint` | Desktop vault / persist flag |
| `providerReady` | Selected provider credentials |

### Out of scope

- Collapsible icon-rail; Projects / Agents destinations as primary modes; Gallery filter pane; Activity timeline in the sidebar

---

## Shell: Projects (0.3a)

See [`projects-design.md`](./projects-design.md).

- Project picker under workspace brand (Inbox + named projects).
- Sessions and gallery assets carry `projectId`; sidebar / Gallery / Activity filter by `settings.projects.activeProjectId`.
- Image generation uses `selectedImageProviderId` + `imageBaseUrl` (may differ from chat provider).

---

## Page: Activity

### Purpose

Local recents feed — recent chat sessions and gallery assets. No analytics backend.

### Layout

1. Recent chats — title + relative `updatedAt`; click opens that session in Chat.
2. Recent images — thumb + prompt snippet; actions: open Gallery focus / reuse in Chat (wired from Gallery deepen).

### Wiring

| Data | Source |
|------|--------|
| Sessions | `listChatSessions()` (`updatedAt` on summary) |
| Assets | `galleryAssets` already loaded in app shell |

---

## Visual direction

- Theme: dual (light / dark via existing tokens)
- Accent: sky (`sky-400` / `sky-500`) for active source and selected model
- Surface rule: settings card on `surface` / `surface-muted`; connection panel bordered, not nested card-in-card
- Density: studio
- **NOT:** large equal provider marketing cards; hardcoded model catalogs as the primary list; credentials buried below models

---

## Page: Settings → AI & keys

### Purpose

Connect one AI source (cloud key or local host), discover available models, then select text and image models for the workspace.

### Archetype

Settings form / connection panel (single active BYOK connection).

### Layout (top to bottom)

1. **Sources** — compact segmented row of five sources (logos + short labels). Active source uses sky border/fill. Connected / Not connected chip beside the section title.
2. **Connection** — credentials for the active source (API key + label; base URL when required or optional per source mapping). Status line. Primary action: Refresh models.
3. **Models** — filter chips + discovered/custom model grid. Empty / discovering / error states as below.
4. **Advanced** (collapsed by default via `<details>`) — manual model ID, display toggles.
5. **Default system prompt** — existing textarea (unchanged behavior).

### Source → provider mapping

| UI source | `selectedProviderId` | Base URL field |
|-----------|----------------------|----------------|
| OpenAI | `openai` | Optional override |
| Anthropic | `anthropic` | Hidden |
| Google | `google` | Hidden |
| Custom | `openai-compatible` | Required (placeholder OpenRouter / Groq / LiteLLM) |
| Local | `local` | Shown; default hint `http://127.0.0.1:11434` |
| ComfyUI | `comfyui` | Required; default `http://127.0.0.1:8188` (image-only local diffusion) |

Mock is omitted from the primary picker unless runtime only exposes mock (dev fallback).

**ComfyUI:** curated txt2img preset via ComfyUI HTTP API (`/prompt` → poll `/history` → `/view`). No node graph in Miro. Checkpoint filename = selected image model id. Chat text is not supported on this source — switch to another provider for conversations.

Runtime may still list both `openai` and `openai-compatible`; the UI source list **dedupes** to the five sources above.

### States

| State | Condition | UI |
|-------|-----------|-----|
| Disconnected | No BYOK key (and provider not `ready` via env); local always “reachable attempt” | Chip: Not connected. Models empty copy: “Add a key and refresh to load models.” (Local: “Refresh to load models from your Ollama host.”) |
| Discovering | `catalogLoading` | Refresh button disabled; “Refreshing…” |
| Ready | Credentials present and `discoveredCount > 0` or catalog non-empty | Chip: Connected. Model list selectable. |
| Error | `discoveryError` set | Amber message; advanced manual model ID still available. |

### Components

| Component | Responsibility |
|-----------|----------------|
| `AiKeysCard` | Orchestrates sources → connection → models → advanced |
| Source buttons | `aria-pressed`; keyboard focusable; logo + label |
| Connection fields | Controlled/uncontrolled inputs writing `aiView.byok*` |
| Model grid | Select text vs image model; filter tags |

### Accessibility

- Source group: role implied by pressed buttons; section labeled “Sources”.
- Refresh models: disabled while loading; announce status via visible text (no live region required this pass).
- Model buttons: `aria-pressed` for selection.

### Wiring

| UI action | Settings / API |
|-----------|----------------|
| Select source | `aiView.selectedProviderId` (+ first available model if any); set `byokProvider` to source id |
| Edit key / label / base URL | `aiView.byokKey`, `byokLabel`, `byokBaseUrl` |
| Refresh models | `useAiModelCatalog.refresh` → `POST /ai/models` |
| Select model | `selectedModelId` or `selectedImageModelId` |

### Out of scope

- Multi-provider saved keys
- Named list of arbitrary custom endpoints
- Plugin providers
