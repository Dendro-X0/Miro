# Mobile (Expo)

Native Expo client for Miro. Shares **`@miro/core`** (API, settings types) with web; UI is rebuilt in React Native (not a WebView of `miro-web`).

Desktop remains the privacy product (encrypted vault). Mobile uses **SecureStore** for BYOK and **AsyncStorage** for sessions.

## Run

```bash
# Terminal 1 — API (reachable from the device/emulator)
pnpm --filter @miro/api

# Terminal 2
pnpm --filter miro-mobile start
```

Create `apps/miro-mobile/.env`:

```bash
# iOS simulator / Expo web
EXPO_PUBLIC_MIRO_API_BASE_URL=http://localhost:8787

# Android emulator → host machine
# EXPO_PUBLIC_MIRO_API_BASE_URL=http://10.0.2.2:8787

# Physical device → your LAN IP
# EXPO_PUBLIC_MIRO_API_BASE_URL=http://192.168.x.x:8787
```

You can also set the API base URL in **Settings** inside the app.

## Current capabilities (next-version track)

- Streaming chat (`MiroApiClient.streamChatText`) with Stop
- Multi-chat sessions (create / switch / delete)
- BYOK in SecureStore; provider + model discovery via `/ai/config` and `/ai/models`
- Optional Miro API base URL (LAN / emulator)
- Separate optional provider/gateway base URL (`byokBaseUrl`) — not the Miro API host
- Vision + gallery size caps; quota-aware AsyncStorage writes
- Atomic backup import (rollback) and live chat refresh after import
- Markdown export (share sheet) + passphrase-encrypted backup import/export (interop with web/desktop)
- Light assistant markdown (fences, headings, lists, bold/italic, inline code)
- Image mode → `generateImage` + Gallery (AsyncStorage, max 40)
- Vision attach (`expo-image-picker`) for supported providers

## Still to come

- Full markdown / syntax highlight parity with web
- Regenerate / edit turns
- Pin / rename sessions

## Architecture choice

We do **not** embed the Next.js Tailwind shell. Responsive web layout informs UX; components stay platform-native so SecureStore and RN performance stay clean.
