export const MIRO_BACKUP_VERSION = 2 as const;

export interface MiroBackupSession {
  readonly id: string;
  readonly title: string;
  readonly pinned: boolean;
  readonly instructions?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly projectId?: string | null;
}

export interface MiroBackupMessage {
  readonly id: string;
  readonly sessionId: string;
  readonly role: string;
  readonly content: string;
  readonly createdAt: number;
}

export interface MiroBackupGalleryAsset {
  readonly id: string;
  readonly prompt: string;
  readonly mime: string;
  readonly dataUrl: string;
  readonly sessionId: string | null;
  readonly createdAt: number;
  readonly projectId?: string | null;
}

export interface MiroBackupProject {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly defaultComfyCheckpoint?: string | null;
}

export interface MiroBackupPayload {
  readonly version: 1 | 2 | typeof MIRO_BACKUP_VERSION;
  readonly exportedAt: number;
  readonly sessions: readonly MiroBackupSession[];
  readonly messages: readonly MiroBackupMessage[];
  readonly gallery: readonly MiroBackupGalleryAsset[];
  readonly projects?: readonly MiroBackupProject[];
  readonly activeProjectId?: string | null;
}

export interface MiroEncryptedBackupFile {
  readonly format: "miro-backup-v1";
  readonly salt: string;
  readonly iv: string;
  readonly ciphertext: string;
}
