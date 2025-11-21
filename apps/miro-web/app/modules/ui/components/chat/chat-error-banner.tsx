"use client";

import type { ReactElement } from "react";
import { AlertCircle } from "lucide-react";

interface ChatErrorBannerProps {
  readonly message: string;
  readonly onRetry: () => void;
  readonly onDismiss: () => void;
}

export default function ChatErrorBanner(props: ChatErrorBannerProps): ReactElement {
  const { message, onRetry, onDismiss } = props;
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl border border-red-500/60 bg-red-500/5 px-3 py-2 text-[11px] text-red-700 dark:bg-red-500/10 dark:text-red-200"
      role="alert"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-300" aria-hidden="true" />
        <p className="text-left">{message}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-red-500/90 px-2.5 py-1 text-[11px] font-medium text-slate-950 shadow-sm hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] text-red-600 hover:text-red-800 focus-visible:outline-none focus-visible:underline dark:text-red-200 dark:hover:text-red-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
