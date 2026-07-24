# Milestone 0.3 — Projects + continuity · Desktop hardening

**Status:** locked (next execution band)  
**Bands:** v1.x product + desktop release track (parallel workstreams)  
**Out of scope:** video, RAG, plugins, Comfy node graph, mobile feature expansion beyond weekly polish

---

## Dual workstreams

```
0.3a Projects + continuity     0.3b Desktop release hardening
        \                         /
         \                       /
          v                     v
     Definition of done (both lanes green → cut 0.3.0)
```

Ship when **both** lanes meet DoD. Either lane may land in preview builds earlier; the version cut waits for both.

---

## 0.3a — Projects + continuity

### Goal

Miro feels like a workspace you return to weekly: scoped chats and assets, not one flat pile.

### In scope

1. **Projects** — create / rename / delete; encrypted on desktop vault, simple local store on web  
2. **Membership** — assign chats and gallery assets to a project (or “Inbox” / unscoped)  
3. **Shell** — project picker near workspace brand; Chat sidebar sessions, Gallery, and Activity respect active project  
4. **Continuity** — image path can use ComfyUI (or another image provider) **without** forcing chat off the text provider (split text vs image provider/model in settings or generate path)  
5. **Optional deepen (if time)** — one Comfy img2img curated preset **or** per-project default Comfy checkpoint — not both required for DoD  

### Definition of done (0.3a)

- [x] CRUD projects; active project persists across relaunch  
- [x] New chats and new gallery assets default to active project  
- [x] Sidebar / Gallery / Activity filter by active project  
- [x] Chat text provider stays usable while generating images via ComfyUI (or documented image-only override without breaking chat)  
- [x] Spec: `docs/frontend-spec.md` Projects section + `docs/product-surfaces.md` updated  
- [x] Backup export/import includes projects (desktop membership + settings projects; payload v2 fields)  

### Explicit non-goals (0.3a)

- Project sharing / multi-user  
- Nested projects or tags taxonomy  
- Full Comfy workflow editor  

---

## 0.3b — Desktop release hardening

### Goal

Installers work for people who are not Miro developers; documented gaps become checklist items.

### In scope

1. **Node-free (or Node-less UX) API sidecar** — reduce or eliminate “Node on PATH” for release installs (static binary, embedded runtime, or clear bundled Node — pick one design before coding)  
2. **Release smoke checklist** — expand [`docs/desktop.md`](./desktop.md) verification table; run once per platform target before cut  
3. **Signing / coffee-price notes** — document optional signed builds; no requirement to ship paid binaries in-tree  
4. **Production PWA deploy guide** — short Vercel/static host path for demo surface ([`docs`](.) — new or extend getting-started/self-hosting)  

### Definition of done (0.3b)

- [x] Design note for sidecar strategy checked into `docs/` or `specs/`  
- [x] Release build path documented; smoke checklist expanded (Windows primary)  
- [x] PWA deploy guide published  
- [x] CHANGELOG / ROADMAP reflect remaining known gaps honestly  
- [ ] Manual Windows smoke signed off at cut time

### Explicit non-goals (0.3b)

- App Store / Play submission  
- Changing primary product away from desktop vault  

---

## Sequencing (remainder)

| Order | Work | Status |
|-------|------|--------|
| Manual Windows smoke | Before 0.3.0 cut |
| Node SEA | Post-0.3 follow-up per sidecar-strategy |

---

## Anti-goals (unchanged)

From [`ROADMAP.md`](../ROADMAP.md): no multi-user SaaS, no RAG marketplace, no video in this band, integrate Comfy via API only, keep installer small.

---

## Related

- Roadmap tiers: [`ROADMAP.md`](../ROADMAP.md)  
- Surfaces map: [`product-surfaces.md`](./product-surfaces.md)  
- Desktop ops: [`desktop.md`](./desktop.md)  
