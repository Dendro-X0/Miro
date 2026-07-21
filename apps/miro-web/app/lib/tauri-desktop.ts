import type {
  DesktopInfo,
  VaultGalleryAsset,
  VaultMessageRecord,
  VaultSessionSummary,
} from "@miro/core";

const BYOK_KEYCHAIN_ACCOUNT = "byok-api-key";

type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

function getTauriInvoke(): TauriInvoke | null {
  if (typeof window === "undefined") {
    return null;
  }
  const globals = window as Window & {
    __TAURI__?: { core?: { invoke: TauriInvoke } };
    __TAURI_INTERNALS__?: unknown;
  };
  if (globals.__TAURI__?.core?.invoke) {
    return globals.__TAURI__.core.invoke.bind(globals.__TAURI__.core);
  }
  return null;
}

/** True when the UI is running inside the Tauri desktop shell. */
export function isTauriDesktop(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const globals = window as Window & {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };
  return globals.__TAURI__ !== undefined || globals.__TAURI_INTERNALS__ !== undefined;
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (getTauriInvoke()) {
    return getTauriInvoke()!(command, args);
  }
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(command, args);
}

export async function fetchDesktopInfo(): Promise<DesktopInfo> {
  return invoke<DesktopInfo>("desktop_info");
}

export async function vaultListSessions(): Promise<readonly VaultSessionSummary[]> {
  return invoke<readonly VaultSessionSummary[]>("vault_list_sessions");
}

export async function vaultCreateSession(title: string): Promise<VaultSessionSummary> {
  return invoke<VaultSessionSummary>("vault_create_session", { title });
}

export async function vaultDeleteSession(sessionId: string): Promise<void> {
  return invoke<void>("vault_delete_session", { sessionId });
}

export async function vaultRenameSession(
  sessionId: string,
  title: string,
): Promise<VaultSessionSummary> {
  return invoke<VaultSessionSummary>("vault_rename_session", { sessionId, title });
}

export async function vaultPinSession(
  sessionId: string,
  pinned: boolean,
): Promise<VaultSessionSummary> {
  return invoke<VaultSessionSummary>("vault_pin_session", { sessionId, pinned });
}

export async function vaultSaveMessage(
  sessionId: string,
  role: string,
  content: string,
): Promise<VaultMessageRecord> {
  return invoke<VaultMessageRecord>("vault_save_message", { sessionId, role, content });
}

export async function vaultLoadMessages(sessionId: string): Promise<readonly VaultMessageRecord[]> {
  return invoke<readonly VaultMessageRecord[]>("vault_load_messages", { sessionId });
}

export async function vaultGetSessionInstructions(sessionId: string): Promise<string> {
  return invoke<string>("vault_get_session_instructions", { sessionId });
}

export async function vaultSetSessionInstructions(
  sessionId: string,
  instructions: string,
): Promise<void> {
  return invoke<void>("vault_set_session_instructions", { sessionId, instructions });
}

export async function vaultTruncateMessagesAfter(
  sessionId: string,
  messageId: string,
): Promise<void> {
  return invoke<void>("vault_truncate_messages_after", { sessionId, messageId });
}

export interface VaultBackupPayload {
  readonly version: number;
  readonly exportedAt: number;
  readonly sessions: readonly {
    readonly id: string;
    readonly title: string;
    readonly pinned: boolean;
    readonly instructions: string;
    readonly createdAt: number;
    readonly updatedAt: number;
  }[];
  readonly messages: readonly VaultMessageRecord[];
  readonly gallery: readonly VaultGalleryAsset[];
}

export async function vaultExportBackup(): Promise<VaultBackupPayload> {
  return invoke<VaultBackupPayload>("vault_export_backup");
}

export async function vaultImportBackup(payload: VaultBackupPayload): Promise<void> {
  return invoke<void>("vault_import_backup", { payload });
}

export async function vaultListGallery(): Promise<readonly VaultGalleryAsset[]> {
  return invoke<readonly VaultGalleryAsset[]>("vault_list_gallery");
}

export async function vaultSaveGalleryAsset(input: {
  readonly prompt: string;
  readonly mime: string;
  readonly dataUrl: string;
  readonly sessionId?: string | null;
}): Promise<VaultGalleryAsset> {
  return invoke<VaultGalleryAsset>("vault_save_gallery_asset", {
    prompt: input.prompt,
    mime: input.mime,
    dataUrl: input.dataUrl,
    sessionId: input.sessionId ?? null,
  });
}

export async function vaultDeleteGalleryAsset(assetId: string): Promise<void> {
  return invoke<void>("vault_delete_gallery_asset", { assetId });
}

export async function keychainSetSecret(account: string, secret: string): Promise<void> {
  return invoke<void>("keychain_set_secret", { account, secret });
}

export async function keychainGetSecret(account: string): Promise<string | null> {
  return invoke<string | null>("keychain_get_secret", { account });
}

export async function keychainDeleteSecret(account: string): Promise<void> {
  return invoke<void>("keychain_delete_secret", { account });
}

export async function loadByokKeyFromKeychain(): Promise<string> {
  const value = await keychainGetSecret(BYOK_KEYCHAIN_ACCOUNT);
  return value ?? "";
}

export async function saveByokKeyToKeychain(secret: string): Promise<void> {
  const trimmed = secret.trim();
  if (!trimmed) {
    await keychainDeleteSecret(BYOK_KEYCHAIN_ACCOUNT);
    return;
  }
  await keychainSetSecret(BYOK_KEYCHAIN_ACCOUNT, trimmed);
}

export { BYOK_KEYCHAIN_ACCOUNT };
