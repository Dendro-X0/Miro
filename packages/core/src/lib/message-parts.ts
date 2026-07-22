/** Multipart chat content shared by web + mobile persistence. */

export const MULTIPART_PREFIX = "miro:parts:";

export interface StoredTextPart {
  readonly type: "text";
  readonly text: string;
}

export interface StoredImagePart {
  readonly type: "image";
  readonly image: string;
}

export type StoredMessagePart = StoredTextPart | StoredImagePart;

export function serializeMessageContent(parts: readonly StoredMessagePart[]): string {
  if (parts.length === 1 && parts[0]?.type === "text") {
    return parts[0].text;
  }
  return `${MULTIPART_PREFIX}${JSON.stringify(parts)}`;
}

export function deserializeMessageContent(content: string): readonly StoredMessagePart[] {
  if (!content.startsWith(MULTIPART_PREFIX)) {
    return [{ type: "text", text: content }];
  }
  try {
    const parsed = JSON.parse(content.slice(MULTIPART_PREFIX.length)) as StoredMessagePart[];
    return Array.isArray(parsed) ? parsed : [{ type: "text", text: content }];
  } catch {
    return [{ type: "text", text: content }];
  }
}

export function getTextFromStoredContent(content: string): string {
  return deserializeMessageContent(content)
    .filter((part): part is StoredTextPart => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function supportsVisionProvider(providerId: string): boolean {
  return (
    providerId === "google" ||
    providerId === "openai" ||
    providerId === "openai-compatible" ||
    providerId === "anthropic"
  );
}

export function getImageUrlFromMessageContent(content: string): string | null {
  if (content.startsWith("Generated image: ")) {
    return content.replace("Generated image: ", "").trim();
  }
  return null;
}

export function formatGeneratedImageContent(imageUrl: string): string {
  return `Generated image: ${imageUrl}`;
}
