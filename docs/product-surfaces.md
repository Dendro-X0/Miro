# Product surfaces — Miro workspace

Miro is a **balanced AI studio**: daily assistant chat and generative outputs (text + image) share equal weight. **Activity** is the glue (local recents), not an analytics dashboard.

Stay local-first BYOK. See [`ROADMAP.md`](../ROADMAP.md) for anti-goals.

## Information architecture

| Mode (UI) | Route id | Role |
|-----------|----------|------|
| Chat | `today` | Daily assistant — sessions, composer, memory/search/voice |
| Gallery (Library home) | `gallery` | Generated media library |
| Activity | `activity` | Recent chats + recent images from local data |
| Settings | `settings` | Utility — AI keys, agent, appearance, data |

**Create** is not a separate destination. Compose stays in Chat via assistant mode and empty-state Text / Image entry chips.

```
Studio rail → Chat | Gallery | Activity
            → Settings (footer)
Main pane   → mode content
```

## Ship vs gap

| Job | Shipped | Gap / next |
|-----|---------|------------|
| Daily assistant | Streaming chat, modes, model switcher, voice STT, web search + memory, instructions, regenerate/edit, Markdown export | Stronger empty-state compose entry (Text / Image chips) |
| Content gen | In-thread image gen, vision attach, Gallery browse/delete, **ComfyUI localhost bridge** (curated txt2img) | img2img preset; Projects + Comfy presets |
| Shell | Studio sidebar, Appearance, AI & keys | — |
| Activity | Placeholder | Read-only feed: recent sessions + gallery thumbs |
| Library / Projects | Gallery + chat list | Projects folders (roadmap) after Activity is useful |
| Privacy | Desktop vault + keychain; web localStorage; backup | — |

## Component inventory

### A. Daily assistant (Chat)

- Session list: search, pin, rename, delete, New
- Composer: send, multiline, voice, vision attach, mode row, agent toggles
- Thread: regenerate, edit, export, per-chat instructions
- Empty state: example prompts, Shift+Enter coach, **Text / Image compose chips**
- Defer: calendar/email connectors, personal RAG

### B. Content generation

- In-chat text + image (API providers)
- **ComfyUI** — local diffusion via HTTP API; curated txt2img workflow only (no node graph)
- Gallery grid with delete / reuse in Chat
- Defer: video, ComfyUI node UI, multi-step custom graphs, img2img preset

### C. Library / continuity

- Gallery = media library
- Chats = conversation library (sidebar)
- Next (later): Projects — folders of chats + assets

### D. Activity

Read-only feed from existing local data (no new backend):

- Recent chat sessions (title, relative updated time) → open Chat
- Recent gallery assets (thumb + prompt snippet) → open Gallery or reuse in Chat
- Empty copy when both lists are empty

### E. Settings / trust

AI & keys, Agent, Appearance, Profile, Data & storage, About — utility only; not primary modes.

## Anti-goals (this band)

- No RAG / knowledge base, agent marketplace, or multi-user SaaS
- No video generation tab
- No new primary destinations beyond Chat / Gallery / Activity / Settings
- Desktop UI map does not cancel the Expo mobile track

## Implementation order

1. Activity v1 feed (`activity-view.tsx` + shell wiring)
2. Gallery deepen (reuse prompt / continue in Chat)
3. Chat empty-state Text / Image compose chips
4. Projects — only after 1–3 feel weekly-useful

## Related docs

- Shell / sidebar contracts: [`frontend-spec.md`](./frontend-spec.md)
- Roadmap tiers: [`ROADMAP.md`](../ROADMAP.md)
- Overview index: [`overview.md`](./overview.md)
