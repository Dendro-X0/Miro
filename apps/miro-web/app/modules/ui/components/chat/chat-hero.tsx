"use client";

import type { ReactElement } from "react";
import { ImageIcon, MessageCircle } from "lucide-react";
import type { AssistantMode } from "../../shell/types";

interface ChatHeroProps {
  readonly examples: readonly string[];
  readonly onExampleClick?: (prompt: string) => void;
  readonly onSelectComposeMode?: (mode: Extract<AssistantMode, "text" | "image">) => void;
}

export default function ChatHero(props: ChatHeroProps): ReactElement {
  const { examples, onExampleClick, onSelectComposeMode } = props;

  function handleExampleClick(prompt: string): void {
    if (!onExampleClick) {
      return;
    }
    onExampleClick(prompt);
  }

  return (
    <div className="flex h-full items-center justify-center px-3 text-center">
      <div className="relative w-full max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
          Welcome to your Miro workspace
        </p>
        <h2 className="mt-3 bg-linear-to-r from-emerald-500 via-lime-300 to-sky-500 bg-clip-text text-3xl font-semibold leading-tight text-transparent sm:text-[2.1rem] drop-shadow-[0_0_40px_rgba(16,185,129,0.4)]">
          Ask anything, just like in your favorite chat apps.
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Use the box below to draft, plan, or generate images. Start with an example, or type your own prompt.
        </p>
        {onSelectComposeMode ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={(): void => onSelectComposeMode("text")}
              className="inline-flex items-center gap-1.5 rounded-full border border-surface bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground hover:border-sky-400/80 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Text chat
            </button>
            <button
              type="button"
              onClick={(): void => onSelectComposeMode("image")}
              className="inline-flex items-center gap-1.5 rounded-full border border-surface bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground hover:border-sky-400/80 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Image
            </button>
          </div>
        ) : null}
        <div className="mt-5 flex flex-col items-stretch gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:justify-center">
          {examples.map((example: string): ReactElement => (
            <button
              key={example}
              type="button"
              onClick={(): void => handleExampleClick(example)}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-surface bg-surface-muted px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:border-sky-400/80 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted sm:w-auto"
            >
              <span className="truncate">{example}</span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Hold <kbd className="rounded border border-surface bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">Shift</kbd>
          {" + "}
          <kbd className="rounded border border-surface bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">Enter</kbd>
          {" for multi-line prompts. Press "}
          <kbd className="rounded border border-surface bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">Enter</kbd>
          {" to send."}
        </p>
      </div>
    </div>
  );
}
