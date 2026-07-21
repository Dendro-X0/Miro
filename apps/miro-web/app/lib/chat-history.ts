import type { VaultMessageRecord, VaultSessionSummary } from "@miro/core";
import type { MiroBackupPayload } from "@miro/core";
import { MIRO_BACKUP_VERSION } from "@miro/core";
import { isTauriDesktop } from "./tauri-desktop";
import * as vault from "./tauri-desktop";
import { listGalleryAssets, replaceWebGallery } from "./gallery";

const WEB_STORAGE_KEY = "miro-chat-history-v1";

export interface ChatSessionSummary {
  readonly id: string;
  readonly title: string;
  readonly pinned: boolean;
}

export interface ChatMessageRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly role: string;
  readonly content: string;
  readonly createdAt: number;
}

interface WebStore {
  readonly sessions: readonly {
    readonly id: string;
    readonly title: string;
    readonly pinned: boolean;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly instructions?: string;
  }[];
  readonly messages: readonly {
    readonly id: string;
    readonly sessionId: string;
    readonly role: string;
    readonly content: string;
    readonly createdAt: number;
  }[];
}

function now(): number {
  return Date.now();
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyWebStore(): WebStore {
  return { sessions: [], messages: [] };
}

function readWebStore(): WebStore {
  if (typeof window === "undefined") {
    return emptyWebStore();
  }
  try {
    const raw = window.localStorage.getItem(WEB_STORAGE_KEY);
    if (!raw) {
      return emptyWebStore();
    }
    const parsed = JSON.parse(raw) as WebStore;
    if (!Array.isArray(parsed.sessions) || !Array.isArray(parsed.messages)) {
      return emptyWebStore();
    }
    return parsed;
  } catch {
    return emptyWebStore();
  }
}

function writeWebStore(store: WebStore): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(store));
}

function sortSessions(
  sessions: readonly { readonly id: string; readonly title: string; readonly pinned: boolean; readonly updatedAt: number }[],
): ChatSessionSummary[] {
  return [...sessions]
    .sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      return b.updatedAt - a.updatedAt;
    })
    .map((session) => ({
      id: session.id,
      title: session.title,
      pinned: session.pinned,
    }));
}

function fromVaultSession(session: VaultSessionSummary): ChatSessionSummary {
  return {
    id: session.id,
    title: session.title,
    pinned: session.pinned,
  };
}

function fromVaultMessage(message: VaultMessageRecord): ChatMessageRecord {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  };
}

/** Truncate first user message into a sidebar title. */
export function titleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "New chat";
  }
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

export function isEncryptedChatHistory(): boolean {
  return isTauriDesktop();
}

export async function listChatSessions(): Promise<readonly ChatSessionSummary[]> {
  if (isTauriDesktop()) {
    const sessions = await vault.vaultListSessions();
    return sessions.map(fromVaultSession);
  }
  return sortSessions(readWebStore().sessions);
}

export async function createChatSession(title = "New chat"): Promise<ChatSessionSummary> {
  if (isTauriDesktop()) {
    return fromVaultSession(await vault.vaultCreateSession(title));
  }
  const store = readWebStore();
  const stamp = now();
  const session = {
    id: createId(),
    title: title.trim() || "New chat",
    pinned: false,
    createdAt: stamp,
    updatedAt: stamp,
  };
  writeWebStore({
    sessions: [session, ...store.sessions],
    messages: store.messages,
  });
  return { id: session.id, title: session.title, pinned: session.pinned };
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  if (isTauriDesktop()) {
    await vault.vaultDeleteSession(sessionId);
    return;
  }
  const store = readWebStore();
  writeWebStore({
    sessions: store.sessions.filter((session) => session.id !== sessionId),
    messages: store.messages.filter((message) => message.sessionId !== sessionId),
  });
}

export async function renameChatSession(
  sessionId: string,
  title: string,
): Promise<ChatSessionSummary> {
  if (isTauriDesktop()) {
    return fromVaultSession(await vault.vaultRenameSession(sessionId, title));
  }
  const store = readWebStore();
  const nextTitle = title.trim() || "Untitled chat";
  const stamp = now();
  writeWebStore({
    sessions: store.sessions.map((session) =>
      session.id === sessionId
        ? { ...session, title: nextTitle, updatedAt: stamp }
        : session,
    ),
    messages: store.messages,
  });
  const updated = readWebStore().sessions.find((session) => session.id === sessionId);
  return {
    id: sessionId,
    title: updated?.title ?? nextTitle,
    pinned: updated?.pinned ?? false,
  };
}

export async function pinChatSession(
  sessionId: string,
  pinned: boolean,
): Promise<ChatSessionSummary> {
  if (isTauriDesktop()) {
    return fromVaultSession(await vault.vaultPinSession(sessionId, pinned));
  }
  const store = readWebStore();
  const stamp = now();
  writeWebStore({
    sessions: store.sessions.map((session) =>
      session.id === sessionId ? { ...session, pinned, updatedAt: stamp } : session,
    ),
    messages: store.messages,
  });
  const updated = readWebStore().sessions.find((session) => session.id === sessionId);
  return {
    id: sessionId,
    title: updated?.title ?? "Untitled chat",
    pinned: updated?.pinned ?? pinned,
  };
}

export async function saveChatMessage(
  sessionId: string,
  role: string,
  content: string,
): Promise<ChatMessageRecord> {
  if (isTauriDesktop()) {
    return fromVaultMessage(await vault.vaultSaveMessage(sessionId, role, content));
  }
  const store = readWebStore();
  const stamp = now();
  const message = {
    id: createId(),
    sessionId,
    role,
    content,
    createdAt: stamp,
  };
  writeWebStore({
    sessions: store.sessions.map((session) =>
      session.id === sessionId ? { ...session, updatedAt: stamp } : session,
    ),
    messages: [...store.messages, message],
  });
  return message;
}

export async function loadChatMessages(sessionId: string): Promise<readonly ChatMessageRecord[]> {
  if (isTauriDesktop()) {
    const messages = await vault.vaultLoadMessages(sessionId);
    return messages.map(fromVaultMessage);
  }
  return readWebStore()
    .messages.filter((message) => message.sessionId === sessionId)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((message) => ({
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    }));
}

export async function getChatSessionInstructions(sessionId: string): Promise<string> {
  if (isTauriDesktop()) {
    return vault.vaultGetSessionInstructions(sessionId);
  }
  const session = readWebStore().sessions.find((item) => item.id === sessionId);
  return session?.instructions ?? "";
}

export async function setChatSessionInstructions(
  sessionId: string,
  instructions: string,
): Promise<void> {
  if (isTauriDesktop()) {
    await vault.vaultSetSessionInstructions(sessionId, instructions);
    return;
  }
  const store = readWebStore();
  writeWebStore({
    sessions: store.sessions.map((session) =>
      session.id === sessionId ? { ...session, instructions, updatedAt: now() } : session,
    ),
    messages: store.messages,
  });
}

export async function truncateChatMessagesAfter(
  sessionId: string,
  messageId: string,
): Promise<void> {
  if (isTauriDesktop()) {
    await vault.vaultTruncateMessagesAfter(sessionId, messageId);
    return;
  }
  const store = readWebStore();
  const target = store.messages.find(
    (message) => message.id === messageId && message.sessionId === sessionId,
  );
  if (!target) {
    return;
  }
  writeWebStore({
    sessions: store.sessions,
    messages: store.messages.filter(
      (message) =>
        !(message.sessionId === sessionId && message.createdAt >= target.createdAt),
    ),
  });
}

export async function exportBackupPayload(): Promise<MiroBackupPayload> {
  if (isTauriDesktop()) {
    const payload = await vault.vaultExportBackup();
    return {
      version: MIRO_BACKUP_VERSION,
      exportedAt: payload.exportedAt,
      sessions: payload.sessions.map((session) => ({
        id: session.id,
        title: session.title,
        pinned: session.pinned,
        instructions: session.instructions,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
      messages: payload.messages.map((message) => ({
        id: message.id,
        sessionId: message.sessionId,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
      gallery: payload.gallery.map((asset) => ({
        id: asset.id,
        prompt: asset.prompt,
        mime: asset.mime,
        dataUrl: asset.dataUrl,
        sessionId: asset.sessionId,
        createdAt: asset.createdAt,
      })),
    };
  }

  const store = readWebStore();
  const gallery = await listGalleryAssets();
  return {
    version: MIRO_BACKUP_VERSION,
    exportedAt: Date.now(),
    sessions: store.sessions.map((session) => ({
      id: session.id,
      title: session.title,
      pinned: session.pinned,
      instructions: session.instructions ?? "",
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })),
    messages: store.messages.map((message) => ({
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
    gallery: gallery.map((asset) => ({
      id: asset.id,
      prompt: asset.prompt,
      mime: asset.mime,
      dataUrl: asset.dataUrl,
      sessionId: asset.sessionId,
      createdAt: asset.createdAt,
    })),
  };
}

export async function importBackupPayload(payload: MiroBackupPayload): Promise<void> {
  if (isTauriDesktop()) {
    await vault.vaultImportBackup({
      version: payload.version,
      exportedAt: payload.exportedAt,
      sessions: payload.sessions.map((session) => ({
        id: session.id,
        title: session.title,
        pinned: session.pinned,
        instructions: session.instructions ?? "",
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
      messages: payload.messages.map((message) => ({
        id: message.id,
        sessionId: message.sessionId,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
      gallery: payload.gallery.map((asset) => ({
        id: asset.id,
        prompt: asset.prompt,
        mime: asset.mime,
        dataUrl: asset.dataUrl,
        sessionId: asset.sessionId,
        createdAt: asset.createdAt,
      })),
    });
    return;
  }

  writeWebStore({
    sessions: payload.sessions.map((session) => ({
      id: session.id,
      title: session.title,
      pinned: session.pinned,
      instructions: session.instructions ?? "",
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })),
    messages: payload.messages.map((message) => ({
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  });
  replaceWebGallery(
    payload.gallery.map((asset) => ({
      id: asset.id,
      prompt: asset.prompt,
      mime: asset.mime,
      dataUrl: asset.dataUrl,
      sessionId: asset.sessionId,
      createdAt: asset.createdAt,
    })),
  );
}

export async function clearWebChatHistory(): Promise<void> {
  if (isTauriDesktop() || typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(WEB_STORAGE_KEY);
}

export { WEB_STORAGE_KEY };
