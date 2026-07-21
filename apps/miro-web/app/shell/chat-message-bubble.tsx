"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import type { UIMessage } from "@ai-sdk/react";
import { Pencil, RotateCcw } from "lucide-react";
import MarkdownRenderer from "../modules/ui/components/chat/markdown-renderer";
import {
  getImageUrlFromMessageContent,
  getUiMessageParts,
  getUiMessageText,
} from "../lib/message-parts";

interface ChatMessageBubbleProps {
  readonly message: UIMessage;
  readonly isLastAssistant: boolean;
  readonly onRegenerate: () => void;
  readonly onEditUser: (messageId: string, nextText: string) => void;
}

export default function ChatMessageBubble(props: ChatMessageBubbleProps): ReactElement {
  const { message, isLastAssistant, onRegenerate, onEditUser } = props;
  const isUser = message.role === "user";
  const parts = getUiMessageParts(message);
  const content = getUiMessageText(message);
  const imageUrl = !isUser ? getImageUrlFromMessageContent(content) : null;
  const attachedImages = isUser
    ? parts.filter((part) => part.type === "image").map((part) => part.image)
    : [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  return (
    <div className={`group flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-sky-500/90 text-slate-950 shadow-md"
            : "surface-bubble-muted border border-surface shadow-sm"
        }`}
      >
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              className="w-full resize-y rounded-xl border border-surface bg-surface px-2 py-1 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onEditUser(message.id, draft);
                  setEditing(false);
                }}
                className="rounded-full bg-sky-500/90 px-2.5 py-0.5 text-[11px] font-medium text-slate-950"
              >
                Save & resend
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full px-2.5 py-0.5 text-[11px] text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : imageUrl ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Generated image</p>
            <img src={imageUrl} alt="Generated" className="max-h-64 rounded-lg object-contain" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {attachedImages.map((src) => (
              <img
                key={src.slice(0, 48)}
                src={src}
                alt="Attached"
                className="max-h-48 rounded-lg object-contain"
              />
            ))}
            {content ? <MarkdownRenderer content={content} /> : null}
          </div>
        )}
        {!editing ? (
          <div className="mt-1 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {isUser ? (
              <button
                type="button"
                onClick={() => {
                  setDraft(content);
                  setEditing(true);
                }}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-surface"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            ) : isLastAssistant ? (
              <button
                type="button"
                onClick={onRegenerate}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-surface"
              >
                <RotateCcw className="h-3 w-3" />
                Regenerate
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
