import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import {
  backupExportFilename,
  chatExportFilename,
  decryptBackupPayload,
  encryptBackupPayload,
  formatChatMarkdown,
  parseEncryptedBackupJson,
  type MiroEncryptedBackupFile,
} from "@miro/core";
import { exportMobileBackupPayload, importMobileBackupPayload } from "./backup";
import { loadMessages } from "./chat-sessions";

function cachePath(filename: string): string {
  const base = FileSystem.cacheDirectory;
  if (!base) {
    throw new Error("FileSystem cacheDirectory is unavailable");
  }
  return `${base}${filename}`;
}

async function writeAndShare(path: string, mimeType: string, dialogTitle: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available on this device");
  }
  await Sharing.shareAsync(path, {
    mimeType,
    dialogTitle,
    UTI: mimeType === "text/markdown" ? "public.plain-text" : "public.json",
  });
}

export async function shareChatMarkdown(input: {
  readonly title: string;
  readonly messages: readonly { readonly role: string; readonly content: string }[];
}): Promise<string> {
  const markdown = formatChatMarkdown({
    title: input.title,
    messages: input.messages,
  });
  const filename = chatExportFilename(input.title);
  const path = cachePath(filename);
  await FileSystem.writeAsStringAsync(path, markdown, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await writeAndShare(path, "text/markdown", "Export chat Markdown");
  return filename;
}

export async function shareActiveSessionMarkdown(
  sessionId: string,
  title: string,
): Promise<string> {
  const messages = await loadMessages(sessionId);
  return shareChatMarkdown({
    title,
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  });
}

export async function shareEncryptedBackup(passphrase: string): Promise<string> {
  if (passphrase.trim().length < 8) {
    throw new Error("Passphrase must be at least 8 characters");
  }
  const payload = await exportMobileBackupPayload();
  const file = await encryptBackupPayload(payload, passphrase.trim());
  const filename = backupExportFilename();
  const path = cachePath(filename);
  await FileSystem.writeAsStringAsync(path, JSON.stringify(file, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await writeAndShare(path, "application/json", "Export Miro backup");
  return filename;
}

export async function pickAndImportEncryptedBackup(passphrase: string): Promise<void> {
  if (!passphrase.trim()) {
    throw new Error("Passphrase is required");
  }
  const picked = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "public.json", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.[0]?.uri) {
    throw new Error("Import cancelled");
  }
  const text = await FileSystem.readAsStringAsync(picked.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const encrypted: MiroEncryptedBackupFile = parseEncryptedBackupJson(text);
  const payload = await decryptBackupPayload(encrypted, passphrase.trim());
  await importMobileBackupPayload(payload);
}
