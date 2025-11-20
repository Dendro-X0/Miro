"use client";

import type { ChangeEvent, FormEvent, KeyboardEvent, ReactElement } from "react";
import { useState } from "react";
import { ArrowUpCircle, Loader2, Mic } from "lucide-react";
import type { ChatInputBarProps } from "./types";

const maxTextareaHeightPx: number = 160;

function autoResizeTextarea(element: HTMLTextAreaElement): void {
  const elementRef: HTMLTextAreaElement = element;
  elementRef.style.height = "0px";
  const nextHeight: number = Math.min(elementRef.scrollHeight, maxTextareaHeightPx);
  elementRef.style.height = `${nextHeight}px`;
}

export default function ChatInputBar(props: ChatInputBarProps): ReactElement {
  const { onSend, onGenerateImage, sending, onFocus } = props;
  const [value, setValue] = useState<string>("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    sendCurrentValue();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendCurrentValue();
    }
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    const nextValue: string = event.target.value;
    setValue(nextValue);
    autoResizeTextarea(event.target);
  }

  function handleFocus(): void {
    if (!onFocus) {
      return;
    }
    onFocus();
  }

  function sendCurrentValue(): void {
    const trimmed: string = value.trim();
    if (!trimmed || sending) {
      return;
    }
    onSend(trimmed);
    setValue("");
  }

  function handleGenerateImageClick(): void {
    const trimmed: string = value.trim();
    if (!onGenerateImage || sending || !trimmed) {
      return;
    }
    onGenerateImage(trimmed);
    setValue("");
  }

  const disableSend: boolean = sending || value.trim().length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Chat input"
      className="surface-panel bg-surface-muted flex items-center gap-3 rounded-2xl px-3 py-2 chat-input-safe shadow-[0_0_40px_rgba(56,189,248,0.25)]"
    >
      <p id="chat-input-help" className="sr-only">
        Press Enter to send. Press Shift and Enter for a new line.
      </p>
      <button
        type="button"
        disabled={sending}
        onClick={handleGenerateImageClick}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-surface bg-surface-muted text-foreground hover:border-sky-400/80 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted"
      >
        <Mic className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Generate image from prompt</span>
      </button>
      <textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        rows={1}
        placeholder="Ask Miro about your workspace..."
        aria-label="Chat message"
        aria-describedby="chat-input-help"
        className="max-h-32 flex-1 resize-none overflow-y-auto bg-transparent py-2 text-sm text-foreground placeholder:text-slate-500 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      />
      <button
        type="submit"
        disabled={disableSend}
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-slate-950 shadow-lg hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowUpCircle className="h-5 w-5" aria-hidden="true" />
        )}
        <span className="sr-only">Send message</span>
      </button>
    </form>
  );
}
