"use client";

import type { ChangeEvent, ReactElement } from "react";

interface ChatInstructionsPanelProps {
  readonly globalPrompt: string;
  readonly sessionInstructions: string;
  readonly onChangeSessionInstructions: (value: string) => void;
  readonly onSaveSessionInstructions: () => void;
}

export default function ChatInstructionsPanel(
  props: ChatInstructionsPanelProps,
): ReactElement {
  const {
    globalPrompt,
    sessionInstructions,
    onChangeSessionInstructions,
    onSaveSessionInstructions,
  } = props;

  return (
    <div className="rounded-2xl border border-surface bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-foreground">Chat instructions</p>
        <button
          type="button"
          onClick={onSaveSessionInstructions}
          className="rounded-full bg-sky-500/90 px-2.5 py-0.5 text-[11px] font-medium text-slate-950 hover:bg-sky-400"
        >
          Save
        </button>
      </div>
      {globalPrompt.trim() ? (
        <p className="mt-1 text-[11px]">
          Workspace default is active. Per-chat instructions below are appended.
        </p>
      ) : (
        <p className="mt-1 text-[11px]">
          Optional instructions for this chat only. Set a workspace default in Settings → AI & keys.
        </p>
      )}
      <textarea
        value={sessionInstructions}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>): void =>
          onChangeSessionInstructions(event.target.value)
        }
        rows={3}
        placeholder="e.g. Reply concisely. Prefer bullet points."
        className="mt-2 w-full resize-y rounded-xl border border-surface bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      />
    </div>
  );
}
