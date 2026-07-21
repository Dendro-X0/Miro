import type { UIMessage } from "@ai-sdk/react";

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

export function getUiMessageParts(message: UIMessage): readonly StoredMessagePart[] {
  const parts = message.parts ?? [];
  const mapped: StoredMessagePart[] = [];
  for (const part of parts) {
    if (part.type === "text") {
      mapped.push({ type: "text", text: (part as { text: string }).text });
      continue;
    }
    const partType = (part as { type: string }).type;
    if (partType === "image") {
      const image = (part as { image?: string | URL }).image;
      const value = typeof image === "string" ? image : image?.toString() ?? "";
      if (value) {
        mapped.push({ type: "image", image: value });
      }
    }
  }
  return mapped;
}

export function getUiMessageText(message: UIMessage): string {
  return getUiMessageParts(message)
    .filter((part): part is StoredTextPart => part.type === "text")
    .map((part) => part.text)
    .join("");
}

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

export function recordsToUiMessages(
  records: readonly { readonly id: string; readonly role: string; readonly content: string }[],
): UIMessage[] {
  return records.map((record) => ({
    id: record.id,
    role: record.role as "user" | "assistant",
    parts: deserializeMessageContent(record.content) as UIMessage["parts"],
  })) as UIMessage[];
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
