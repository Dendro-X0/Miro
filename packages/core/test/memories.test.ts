import assert from "node:assert/strict";
import {
  createMemoryEntry,
  dedupeMemories,
  extractMemoryFromAssistantText,
  formatMemoriesForPrompt,
} from "../src/lib/memories";

const formatted = formatMemoriesForPrompt([
  createMemoryEntry("Prefers concise answers"),
]);
assert.ok(formatted.includes("Prefers concise answers"));

const extracted = extractMemoryFromAssistantText(
  "Sure, I'll remember that.\n\n[MEMORY: Uses dark mode]",
);
assert.equal(extracted.memory, "Uses dark mode");
assert.ok(!extracted.cleanedText.includes("[MEMORY:"));

const deduped = dedupeMemories(
  [createMemoryEntry("Likes TypeScript")],
  createMemoryEntry("likes typescript"),
);
assert.equal(deduped.length, 1);
assert.equal(deduped[0]?.content, "likes typescript");

console.log("memories.test: OK");
