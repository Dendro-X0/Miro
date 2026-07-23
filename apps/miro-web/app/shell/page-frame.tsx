"use client";

import type { ReactElement, ReactNode } from "react";
import UiKickerLabel from "../ui/kicker-label";

interface PageFrameProps {
  readonly kicker?: string;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Shared main-panel layout for Gallery, Activity, Settings, and similar views.
 * Keeps title stack + scroll body consistent with the rounded shell chrome.
 */
export default function PageFrame(props: PageFrameProps): ReactElement {
  const {
    kicker = "Workspace",
    title,
    description,
    actions,
    children,
    className = "",
  } = props;

  return (
    <section
      className={["flex min-h-0 flex-1 flex-col gap-3 pb-4", className].filter(Boolean).join(" ")}
      aria-label={title}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <UiKickerLabel as="p" text={kicker} />
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
