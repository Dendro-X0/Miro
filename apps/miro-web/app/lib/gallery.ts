import type { VaultGalleryAsset } from "@miro/core";
import { isTauriDesktop, vaultDeleteGalleryAsset, vaultListGallery, vaultSaveGalleryAsset } from "./tauri-desktop";

const WEB_GALLERY_KEY = "miro-gallery-v1";
const WEB_GALLERY_MAX = 40;

export type GalleryAsset = VaultGalleryAsset;

function mimeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;,]+)/.exec(dataUrl);
  return match?.[1] ?? "image/png";
}

function readWebGallery(): GalleryAsset[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(WEB_GALLERY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as GalleryAsset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWebGallery(assets: readonly GalleryAsset[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(WEB_GALLERY_KEY, JSON.stringify(assets.slice(0, WEB_GALLERY_MAX)));
}

export function isEncryptedGallery(): boolean {
  return isTauriDesktop();
}

export async function listGalleryAssets(): Promise<readonly GalleryAsset[]> {
  if (isTauriDesktop()) {
    return vaultListGallery();
  }
  return readWebGallery();
}

export async function saveGalleryAsset(input: {
  readonly prompt: string;
  readonly dataUrl: string;
  readonly sessionId?: string | null;
}): Promise<GalleryAsset> {
  const mime = mimeFromDataUrl(input.dataUrl);
  if (isTauriDesktop()) {
    return vaultSaveGalleryAsset({
      prompt: input.prompt,
      mime,
      dataUrl: input.dataUrl,
      sessionId: input.sessionId,
    });
  }

  const asset: GalleryAsset = {
    id: crypto.randomUUID(),
    prompt: input.prompt,
    mime,
    dataUrl: input.dataUrl,
    createdAt: Date.now(),
    sessionId: input.sessionId ?? null,
  };
  const next = [asset, ...readWebGallery()].slice(0, WEB_GALLERY_MAX);
  writeWebGallery(next);
  return asset;
}

export async function deleteGalleryAsset(assetId: string): Promise<void> {
  if (isTauriDesktop()) {
    await vaultDeleteGalleryAsset(assetId);
    return;
  }
  writeWebGallery(readWebGallery().filter((asset) => asset.id !== assetId));
}

export function replaceWebGallery(assets: readonly GalleryAsset[]): void {
  writeWebGallery(assets);
}
