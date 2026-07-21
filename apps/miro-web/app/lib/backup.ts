import type { MiroBackupPayload, MiroEncryptedBackupFile } from "@miro/core";
import { MIRO_BACKUP_VERSION } from "@miro/core";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const saltBytes = new Uint8Array(salt);
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: 120_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBackupPayload(
  payload: MiroBackupPayload,
  passphrase: string,
): Promise<MiroEncryptedBackupFile> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    format: "miro-backup-v1",
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptBackupPayload(
  file: MiroEncryptedBackupFile,
  passphrase: string,
): Promise<MiroBackupPayload> {
  if (file.format !== "miro-backup-v1") {
    throw new Error("Unsupported backup format");
  }
  const salt = fromBase64(file.salt);
  const iv = fromBase64(file.iv);
  const key = await deriveKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(fromBase64(file.ciphertext)),
  );
  const parsed = JSON.parse(new TextDecoder().decode(decrypted)) as MiroBackupPayload;
  if (parsed.version !== MIRO_BACKUP_VERSION) {
    throw new Error("Unsupported backup version");
  }
  return parsed;
}

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
  const parsed = JSON.parse(text) as MiroEncryptedBackupFile;
  if (parsed.format !== "miro-backup-v1") {
    throw new Error("Not a Miro backup file");
  }
  return parsed;
}
