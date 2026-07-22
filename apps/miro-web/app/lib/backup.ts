import type { MiroBackupPayload, MiroEncryptedBackupFile } from "@miro/core";
import {
  decryptBackupPayload,
  encryptBackupPayload,
  parseEncryptedBackupJson,
} from "@miro/core";

export {
  decryptBackupPayload,
  encryptBackupPayload,
  parseEncryptedBackupJson,
};
export type { MiroBackupPayload, MiroEncryptedBackupFile };

export function downloadBackupFile(filename: string, file: MiroEncryptedBackupFile): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readBackupFile(file: File): Promise<MiroEncryptedBackupFile> {
  const text = await file.text();
  return parseEncryptedBackupJson(text);
}
