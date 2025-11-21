"use client";

import type { ReactElement } from "react";

interface ChatHeroProps {
  readonly examples: readonly string[];
  readonly onExampleClick?: (prompt: string) => void;
}

export default function ChatHero(props: ChatHeroProps): ReactElement {
  const { examples, onExampleClick } = props;

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
          Use the box below to explore boards, plan projects, or get quick answers about what is happening in your
          workspace. You can also start with one of these examples.
        </p>
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
      </div>
    </div>
  );
}
