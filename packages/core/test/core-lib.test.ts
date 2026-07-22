/**
 * Minimal node:test suite for shared @miro/core helpers.
 * Run: pnpm --filter @miro/api exec tsx ../../packages/core/test/core-lib.test.ts
 * (or from repo: npx tsx packages/core/test/core-lib.test.ts)
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decryptBackupPayload,
  deserializeMessageContent,
  encryptBackupPayload,
  formatChatMarkdown,
  formatGeneratedImageContent,
  getImageUrlFromMessageContent,
  MIRO_BACKUP_VERSION,
  serializeMessageContent,
} from "../src/index.ts";

test("message parts round-trip", () => {
  const parts = [
    { type: "text" as const, text: "hello" },
    { type: "image" as const, image: "data:image/png;base64,abc" },
  ];
  const stored = serializeMessageContent(parts);
  assert.ok(stored.startsWith("miro:parts:"));
  const back = deserializeMessageContent(stored);
  assert.equal(back.length, 2);
  assert.equal(back[0]?.type, "text");
  assert.equal(back[1]?.type, "image");
});

test("generated image content helper", () => {
  const content = formatGeneratedImageContent("https://example.com/a.png");
  assert.equal(getImageUrlFromMessageContent(content), "https://example.com/a.png");
});

test("formatChatMarkdown marks vision attachments", () => {
  const md = formatChatMarkdown({
    title: "Vision",
    messages: [
      {
        role: "user",
        content: serializeMessageContent([
          { type: "text", text: "What is this?" },
          { type: "image", image: "data:image/png;base64,abc" },
        ]),
      },
    ],
  });
  assert.match(md, /What is this\?/);
  assert.match(md, /image attached/);
});

test("backup encrypt/decrypt round-trip", async () => {
  const payload = {
    version: MIRO_BACKUP_VERSION,
    exportedAt: Date.now(),
    sessions: [
      {
        id: "s1",
        title: "Hello",
        pinned: false,
        instructions: "",
        createdAt: 1,
        updatedAt: 2,
      },
    ],
    messages: [
      {
        id: "m1",
        sessionId: "s1",
        role: "user",
        content: "hi",
        createdAt: 1,
      },
    ],
    gallery: [],
  };
  const file = await encryptBackupPayload(payload, "test-pass-123");
  assert.equal(file.format, "miro-backup-v1");
  const restored = await decryptBackupPayload(file, "test-pass-123");
  assert.equal(restored.sessions[0]?.title, "Hello");
  assert.equal(restored.messages[0]?.content, "hi");
});

test("backup wrong passphrase fails clearly", async () => {
  const payload = {
    version: MIRO_BACKUP_VERSION,
    exportedAt: Date.now(),
    sessions: [],
    messages: [],
    gallery: [],
  };
  const file = await encryptBackupPayload(payload, "correct-passphrase");
  await assert.rejects(
    () => decryptBackupPayload(file, "wrong-passphrase"),
    /Wrong passphrase|corrupted/,
  );
});
