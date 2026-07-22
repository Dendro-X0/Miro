import {
  MIRO_BACKUP_VERSION,
  type MiroBackupPayload,
} from "@miro/core";
import { readChatStore, replaceChatStore, type ChatStore } from "./chat-sessions";
import { listGalleryAssets, replaceGalleryAssets } from "./gallery";

function assertBackupPayload(payload: MiroBackupPayload): void {
  if (payload.version !== MIRO_BACKUP_VERSION) {
    throw new Error("Unsupported backup version");
  }
  if (
    !Array.isArray(payload.sessions) ||
    !Array.isArray(payload.messages) ||
    !Array.isArray(payload.gallery)
  ) {
    throw new Error("Invalid backup payload structure");
  }
}

export async function exportMobileBackupPayload(): Promise<MiroBackupPayload> {
  const store = await readChatStore();
  const gallery = await listGalleryAssets();
  return {
    version: MIRO_BACKUP_VERSION,
    exportedAt: Date.now(),
    sessions: store.sessions.map((session) => ({
      id: session.id,
      title: session.title,
      pinned: false,
      instructions: "",
      createdAt: session.updatedAt,
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

export async function importMobileBackupPayload(payload: MiroBackupPayload): Promise<void> {
  assertBackupPayload(payload);

  const previousChat = await readChatStore();
  const previousGallery = await listGalleryAssets();

  const nextChat: ChatStore = {
    sessions: payload.sessions.map((session) => ({
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
    })),
    messages: payload.messages.map((message) => {
      const role: "user" | "assistant" | "system" =
        message.role === "assistant" || message.role === "system" ? message.role : "user";
      return {
        id: message.id,
        sessionId: message.sessionId,
        role,
        content: message.content,
        createdAt: message.createdAt,
      };
    }),
  };
  const nextGallery = payload.gallery.map((asset) => ({
    id: asset.id,
    prompt: asset.prompt,
    mime: asset.mime,
    dataUrl: asset.dataUrl,
    sessionId: asset.sessionId,
    createdAt: asset.createdAt,
  }));

  try {
    await replaceChatStore(nextChat);
    await replaceGalleryAssets(nextGallery);
  } catch (error) {
    try {
      await replaceChatStore(previousChat);
      await replaceGalleryAssets(previousGallery);
    } catch {
      // Best-effort rollback; surface the original failure.
    }
    throw error;
  }
}
