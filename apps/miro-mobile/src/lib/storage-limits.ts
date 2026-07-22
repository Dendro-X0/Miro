/** Shared mobile storage limits — keep AsyncStorage under typical device quotas. */

/** Max characters for a single vision data URL (~1.5 MB base64). */
export const MAX_VISION_DATA_URL_CHARS = 1_500_000;

/** Soft budget for the entire chat store JSON (~4 MB). */
export const MAX_CHAT_STORE_CHARS = 4_000_000;

/** Soft budget for gallery JSON (~3 MB). */
export const MAX_GALLERY_STORE_CHARS = 3_000_000;

export function assertVisionDataUrlSize(dataUrl: string): void {
  if (dataUrl.length > MAX_VISION_DATA_URL_CHARS) {
    throw new Error(
      "Image is too large to store on this device. Try a smaller photo or lower quality.",
    );
  }
}

export function estimateJsonSize(value: unknown): number {
  return JSON.stringify(value).length;
}

export function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("quota") ||
    message.includes("full") ||
    message.includes("sqlite_full") ||
    message.includes("database or disk is full")
  );
}

export function toStorageError(error: unknown, fallback: string): Error {
  if (isQuotaError(error)) {
    return new Error("Device storage is full. Delete chats or gallery items and try again.");
  }
  if (error instanceof Error && error.message) {
    return error;
  }
  return new Error(fallback);
}
