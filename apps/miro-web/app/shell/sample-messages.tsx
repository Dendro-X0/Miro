import type { ReactElement } from "react";

interface SampleMessagesProps {
  readonly onExampleClick?: (prompt: string) => void;
}

export default function SampleMessages(props: SampleMessagesProps): ReactElement {
  const { onExampleClick } = props;
  const examples: readonly string[] = [
    "Summarize what has been happening in my workspace recently.",
    "Help me plan a brainstorming workshop on a new board.",
    "Find action items from the last board I updated.",
  ];
  const handleExampleClick = (prompt: string): void => {
    if (!onExampleClick) {
      return;
    }
    onExampleClick(prompt);
  };
  return (
    <div className="flex h-full items-center justify-center px-3 text-center">
      <div className="relative w-full max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">
          Welcome to your Miro workspace
        </p>
        <h2 className="mt-3 bg-linear-to-r from-sky-400 via-cyan-200 to-violet-300 bg-clip-text text-3xl font-semibold leading-tight text-transparent sm:text-[2.1rem] drop-shadow-[0_0_40px_rgba(56,189,248,0.45)]">
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
