import { formatChatMarkdown, chatExportFilename } from "@miro/core";
import type { ChatMessageRecord } from "./chat-history";

export { formatChatMarkdown, chatExportFilename };

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

/** @deprecated Prefer importing formatChatMarkdown from @miro/core with ChatMarkdownMessage. */
export type { ChatMessageRecord };
