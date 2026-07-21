import { createMiroApiClient, miroApiPaths, resolveMiroApiBaseUrl } from "@miro/core";
import { isTauriDesktop } from "./tauri-desktop";

function isDesktopUi(): boolean {
  if (process.env.NEXT_PUBLIC_MIRO_DESKTOP === "1") {
    return true;
  }
  if (typeof window !== "undefined" && isTauriDesktop()) {
    return true;
  }
  return false;
}

function createClient() {
  if (isDesktopUi()) {
    return createMiroApiClient({ baseUrl: resolveMiroApiBaseUrl() });
  }
  return createMiroApiClient({ sameOrigin: true });
}

/** API client — same-origin (web rewrites) or absolute URL (Tauri / static desktop). */
export const miroApi = createClient();

export function getChatEndpoint(): string {
  if (isDesktopUi()) {
    return `${resolveMiroApiBaseUrl().replace(/\/$/, "")}${miroApiPaths.chat}`;
  }
  return miroApiPaths.chat;
}

export { miroApiPaths };
