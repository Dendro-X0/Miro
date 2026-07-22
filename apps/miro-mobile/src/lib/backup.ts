import {
  MIRO_BACKUP_VERSION,
  type MiroBackupPayload,
} from "@miro/core";
import { readChatStore, replaceChatStore } from "./chat-sessions";
import { listGalleryAssets, replaceGalleryAssets } from "./gallery";

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
  if (payload.version !== MIRO_BACKUP_VERSION) {
    throw new Error("Unsupported backup version");
  }
  await replaceChatStore({
    sessions: payload.sessions.map((session) => ({
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
    })),
    messages: payload.messages.map((message) => ({
      id: message.id,
      sessionId: message.sessionId,
      role:
        message.role === "assistant" || message.role === "system"
          ? message.role
          : "user",
      content: message.content,
      createdAt: message.createdAt,
    })),
  });
  await replaceGalleryAssets(
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
