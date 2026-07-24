# Design: Projects + image/text continuity (0.3a)

**Status:** approved for implementation  
**Owner:** `packages/core` settings + vault; `apps/miro-web` shell; `apps/miro-desktop` vault  
**Milestone:** [`docs/milestone-0.3.md`](../docs/milestone-0.3.md)

## Contracts

### Project

```ts
interface WorkspaceProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Optional default Comfy checkpoint id for this project */
  defaultComfyCheckpoint?: string | null;
}
```

- Special **Inbox**: `activeProjectId === null` means unscoped (“Inbox”) — shows sessions/assets with `projectId == null`.
- Projects list lives in **settings** (`settings.projects.items` + `activeProjectId`) so web + desktop share one UX; membership on sessions/assets is the source of truth for filtering.

### Membership

| Entity | Field | Notes |
|--------|-------|--------|
| Chat session | `projectId: string \| null` | Set on create from `activeProjectId` |
| Gallery asset | `projectId: string \| null` | Set on save from `activeProjectId` |

Desktop: SQLite `ALTER` add `project_id` on `sessions` and `gallery_assets`.  
Web: extend `miro-chat-history-v1` / `miro-gallery-v1` JSON.

### Continuity (image ≠ chat provider)

| Setting | Role |
|---------|------|
| `aiView.selectedProviderId` | Chat / text |
| `aiView.selectedModelId` | Chat model |
| `aiView.selectedImageProviderId` | Image path (`""` = follow text provider) |
| `aiView.selectedImageModelId` | Image / checkpoint id |
| `aiView.imageBaseUrl` | Optional base URL for image provider (Comfy default `http://127.0.0.1:8188`) |

`POST /v2/ai/image` already accepts `provider` + `baseUrl`; shell passes image fields, not chat provider.

### Backup

Bump `MIRO_BACKUP_VERSION` to **2**:
- `projects: WorkspaceProject[]`
- `activeProjectId: string | null`
- sessions/gallery include `projectId`
- v1 import: `projectId = null`, empty projects

## Invariants

1. Deleting a project reassigns its sessions/assets to Inbox (`projectId = null`); does not delete chats.
2. Active project persists in settings across relaunch.
3. Filtering never hides pinned chats outside the active project without an “All” mode — **v1 filter is hard**: only active project + Inbox when null.

## Proof

- L1: core parse/defaults tests; vault migration opens existing DBs  
- L2: create project → new chat scoped → Gallery filter  
- L3: generate image with `selectedImageProviderId=comfyui` while chat provider remains google/openai  

## Non-goals

Nested projects, sharing, Comfy node UI.
