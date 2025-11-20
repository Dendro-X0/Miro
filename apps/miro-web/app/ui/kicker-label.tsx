"use client";

import type { ReactElement } from "react";

type UiKickerLabelTone = "primary" | "muted";

type UiKickerLabelAs = "span" | "p";

interface UiKickerLabelProps {
  readonly text: string;
  readonly tone?: UiKickerLabelTone;
  readonly as?: UiKickerLabelAs;
}

function buildKickerClassNames(tone: UiKickerLabelTone): string {
  const baseClassName: string = "text-[11px] font-semibold uppercase tracking-[0.16em]";
  const colorClassName: string = tone === "primary" ? "text-sky-400" : "text-muted-foreground";
  return `${baseClassName} ${colorClassName}`;
}

export default function UiKickerLabel(props: UiKickerLabelProps): ReactElement {
  const { text, tone = "primary", as = "span" } = props;
  const className: string = buildKickerClassNames(tone);
  if (as === "p") {
    return <p className={className}>{text}</p>;
  }
  return <span className={className}>{text}</span>;
}
