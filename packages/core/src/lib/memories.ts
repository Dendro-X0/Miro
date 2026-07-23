import type { MemoryEntry } from "../types/agent";

const MEMORY_TAG_PATTERN = /\[MEMORY:\s*(.+?)\]\s*$/s;

export function createMemoryId(): string {
  return `mem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMemoryEntry(content: string): MemoryEntry {
  return {
    id: createMemoryId(),
    content: content.trim(),
    createdAt: Date.now(),
  };
}

export function formatMemoriesForPrompt(memories: readonly MemoryEntry[]): string {
  if (memories.length === 0) {
    return "";
  }
  const lines = memories.map((entry, index) => `${index + 1}. ${entry.content}`);
  return [
    "Personalized memory (facts the user wants you to remember across chats):",
    ...lines,
    "Use these naturally when relevant. When the user asks you to remember something new, confirm and append exactly one line at the very end of your reply: [MEMORY: concise fact]",
  ].join("\n");
}

export function extractMemoryFromAssistantText(text: string): {
  readonly cleanedText: string;
  readonly memory: string | null;
} {
  const match = text.match(MEMORY_TAG_PATTERN);
  if (!match) {
    return { cleanedText: text, memory: null };
  }
  const memory = match[1]?.trim() ?? null;
  const cleanedText = text.replace(MEMORY_TAG_PATTERN, "").trimEnd();
  return { cleanedText, memory: memory && memory.length > 0 ? memory : null };
}

export function dedupeMemories(
  memories: readonly MemoryEntry[],
  next: MemoryEntry,
): MemoryEntry[] {
  const normalized = next.content.trim().toLowerCase();
  const withoutDuplicate = memories.filter(
    (entry) => entry.content.trim().toLowerCase() !== normalized,
  );
  return [...withoutDuplicate, next];
}
