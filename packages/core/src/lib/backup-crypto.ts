import type { MiroBackupPayload, MiroEncryptedBackupFile } from "../types/backup";
import { MIRO_BACKUP_VERSION } from "../types/backup";

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto (crypto.subtle) is unavailable on this runtime");
  }
  return subtle;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  if (typeof globalThis.btoa !== "function") {
    throw new Error("btoa is unavailable on this runtime");
  }
  return globalThis.btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  if (typeof globalThis.atob !== "function") {
    throw new Error("atob is unavailable on this runtime");
  }
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

  async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtle();
  const encoder = new TextEncoder();
  const saltBytes = new Uint8Array(salt);
  const material = await subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
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
  const subtle = getSubtle();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
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
  const subtle = getSubtle();
  const salt = fromBase64(file.salt);
  const iv = fromBase64(file.iv);
  const key = await deriveKey(passphrase, salt);
  let decrypted: ArrayBuffer;
  try {
    decrypted = await subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      new Uint8Array(fromBase64(file.ciphertext)),
    );
  } catch {
    throw new Error("Wrong passphrase or corrupted backup file");
  }
  let parsed: MiroBackupPayload;
  try {
    parsed = JSON.parse(new TextDecoder().decode(decrypted)) as MiroBackupPayload;
  } catch {
    throw new Error("Backup payload is not valid JSON");
  }
  if (parsed.version !== MIRO_BACKUP_VERSION) {
    throw new Error("Unsupported backup version");
  }
  if (
    !Array.isArray(parsed.sessions) ||
    !Array.isArray(parsed.messages) ||
    !Array.isArray(parsed.gallery)
  ) {
    throw new Error("Invalid backup payload structure");
  }
  return parsed;
}

export function parseEncryptedBackupJson(text: string): MiroEncryptedBackupFile {
  let parsed: MiroEncryptedBackupFile;
  try {
    parsed = JSON.parse(text) as MiroEncryptedBackupFile;
  } catch {
    throw new Error("Not a Miro backup file (invalid JSON)");
  }
  if (parsed.format !== "miro-backup-v1") {
    throw new Error("Not a Miro backup file");
  }
  if (!parsed.salt || !parsed.iv || !parsed.ciphertext) {
    throw new Error("Incomplete Miro backup file");
  }
  return parsed;
}

export function backupExportFilename(date = new Date()): string {
  return `miro-backup-${date.toISOString().slice(0, 10)}.mirobackup.json`;
}
