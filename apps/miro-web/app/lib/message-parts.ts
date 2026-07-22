import type { UIMessage } from "@ai-sdk/react";
import {
  deserializeMessageContent,
  getImageUrlFromMessageContent,
  serializeMessageContent,
  supportsVisionProvider,
  type StoredImagePart,
  type StoredMessagePart,
  type StoredTextPart,
} from "@miro/core";

export {
  deserializeMessageContent,
  getImageUrlFromMessageContent,
  serializeMessageContent,
  supportsVisionProvider,
};
export type { StoredImagePart, StoredMessagePart, StoredTextPart };

export { MULTIPART_PREFIX } from "@miro/core";

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

export function recordsToUiMessages(
  records: readonly { readonly id: string; readonly role: string; readonly content: string }[],
): UIMessage[] {
  return records.map((record) => ({
    id: record.id,
    role: record.role as "user" | "assistant",
    parts: deserializeMessageContent(record.content) as UIMessage["parts"],
  })) as UIMessage[];
}
