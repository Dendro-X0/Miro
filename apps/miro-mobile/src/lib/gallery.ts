import AsyncStorage from "@react-native-async-storage/async-storage";
import type { VaultGalleryAsset } from "@miro/core";

const GALLERY_KEY = "miro-mobile-gallery-v1";
const GALLERY_MAX = 40;

export type MobileGalleryAsset = VaultGalleryAsset;

function mimeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;,]+)/.exec(dataUrl);
  return match?.[1] ?? "image/png";
}

async function readGallery(): Promise<MobileGalleryAsset[]> {
  try {
    const raw = await AsyncStorage.getItem(GALLERY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as MobileGalleryAsset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeGallery(assets: readonly MobileGalleryAsset[]): Promise<void> {
  await AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(assets.slice(0, GALLERY_MAX)));
}

export async function listGalleryAssets(): Promise<readonly MobileGalleryAsset[]> {
  const assets = await readGallery();
  return [...assets].sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveGalleryAsset(input: {
  readonly prompt: string;
  readonly dataUrl: string;
  readonly sessionId?: string | null;
}): Promise<MobileGalleryAsset> {
  const asset: MobileGalleryAsset = {
    id: `gallery-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: input.prompt,
    mime: mimeFromDataUrl(input.dataUrl),
    dataUrl: input.dataUrl,
    createdAt: Date.now(),
    sessionId: input.sessionId ?? null,
  };
  const next = [asset, ...(await readGallery())].slice(0, GALLERY_MAX);
  await writeGallery(next);
  return asset;
}

export async function deleteGalleryAsset(assetId: string): Promise<void> {
  const next = (await readGallery()).filter((asset) => asset.id !== assetId);
  await writeGallery(next);
}

/** Replace all gallery assets (destructive — used by backup import). */
export async function replaceGalleryAssets(
  assets: readonly MobileGalleryAsset[],
): Promise<void> {
  await writeGallery(assets);
}
