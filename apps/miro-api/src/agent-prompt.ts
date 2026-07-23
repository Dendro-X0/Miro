import { formatMemoriesForPrompt, type MemoryEntry } from "@miro/core";

export function buildAgentSystemPrompt(input: {
  readonly basePrompt?: string;
  readonly memories?: readonly { readonly content: string }[];
  readonly enableMemory?: boolean;
  readonly enableWebSearch?: boolean;
}): string | undefined {
  const sections: string[] = [];

  const base = input.basePrompt?.trim();
  if (base) {
    sections.push(base);
  }

  if (input.enableMemory !== false && (input.memories?.length ?? 0) > 0) {
    const normalized: MemoryEntry[] = (input.memories ?? []).map((entry, index) => ({
      id: `prompt-memory-${index}`,
      content: entry.content,
      createdAt: 0,
    }));
    sections.push(formatMemoriesForPrompt(normalized));
  }

  if (input.enableWebSearch !== false) {
    sections.push(
      "You can use the web_search tool when the user asks about current events, live data, recent releases, or facts you are unsure about. Cite sources from tool results when helpful.",
    );
  }

  if (sections.length === 0) {
    return undefined;
  }
  return sections.join("\n\n");
}
