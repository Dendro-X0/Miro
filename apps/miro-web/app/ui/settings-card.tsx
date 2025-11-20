"use client";

import type { ReactElement, ReactNode } from "react";
import UiKickerLabel from "./kicker-label";

interface SettingsCardProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

/**
 * Shared surface panel shell for settings sections.
 */
export default function SettingsCard(props: SettingsCardProps): ReactElement {
  const { title, description, children } = props;
  return (
    <section className="surface-panel rounded-2xl p-4 text-sm">
      <header>
        <UiKickerLabel as="p" text={title} />
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="mt-3">
        {children}
      </div>
    </section>
  );
}
