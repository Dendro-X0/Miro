export interface VaultGalleryAsset {
  readonly id: string;
  readonly prompt: string;
  readonly mime: string;
  /** data: URL or remote URL persisted after generation */
  readonly dataUrl: string;
  readonly createdAt: number;
  readonly sessionId: string | null;
  readonly projectId: string | null;
}

export interface VaultSessionSummary {
  readonly id: string;
  readonly title: string;
  readonly pinned: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly projectId: string | null;
}

export interface VaultMessageRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly role: string;
  readonly content: string;
  readonly createdAt: number;
}

export interface DesktopInfo {
  readonly platform: string;
  readonly vaultReady: boolean;
}
