import type { ChatMessageRecord } from "./chat-history";

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
  if (content.startsWith("Generated image: ")) {
    const url = content.replace("Generated image: ", "").trim();
    return `![Generated image](${url})`;
  }
  return content;
}

/** Format persisted messages as a Markdown document for download. */
export function formatChatMarkdown(input: {
  readonly title: string;
  readonly instructions?: string;
  readonly messages: readonly ChatMessageRecord[];
}): string {
  const lines: string[] = [`# ${input.title.trim() || "Chat"}`, ""];
  if (input.instructions?.trim()) {
    lines.push("## Instructions", "", input.instructions.trim(), "");
  }
  lines.push("## Messages", "");
  for (const message of input.messages) {
    lines.push(`### ${formatRole(message.role)}`, "", escapeMarkdownImage(message.content), "");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export function downloadMarkdownFile(filename: string, content: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function chatExportFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || "chat"}-${new Date().toISOString().slice(0, 10)}.md`;
}
