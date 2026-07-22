import { getImageUrlFromMessageContent, getTextFromStoredContent } from "./message-parts";

function formatRole(role: string): string {
  if (role === "user") {
    return "You";
  }
  if (role === "assistant") {
    return "Miro";
  }
  if (role === "system") {
    return "System";
  }
  return role;
}

function escapeMarkdownImage(content: string): string {
  const generated = getImageUrlFromMessageContent(content);
  if (generated) {
    return `![Generated image](${generated})`;
  }
  // Multipart vision messages: show text + note about attached image
  if (content.startsWith("miro:parts:")) {
    const text = getTextFromStoredContent(content).trim();
    const hasImage = content.includes('"type":"image"') || content.includes('"type": "image"');
    const lines = [text || "(attachment)"];
    if (hasImage) {
      lines.push("", "*(image attached)*");
    }
    return lines.join("\n");
  }
  return content;
}

export interface ChatMarkdownMessage {
  readonly role: string;
  readonly content: string;
}

/** Format persisted messages as a Markdown document. */
export function formatChatMarkdown(input: {
  readonly title: string;
  readonly instructions?: string;
  readonly messages: readonly ChatMarkdownMessage[];
}): string {
  const lines: string[] = [`# ${input.title.trim() || "Chat"}`, ""];
  if (input.instructions?.trim()) {
    lines.push("## Instructions", "", input.instructions.trim(), "");
  }
  lines.push("## Messages", "");
  for (const message of input.messages) {
    lines.push(`### ${formatRole(message.role)}`, "", escapeMarkdownImage(message.content), "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function chatExportFilename(title: string, date = new Date()): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || "chat"}-${date.toISOString().slice(0, 10)}.md`;
}
