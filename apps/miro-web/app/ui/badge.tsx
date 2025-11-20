"use client";

import type { ReactElement, ReactNode } from "react";
import PillButton from "./pill-button";

type UiBadgeTone = "primary" | "muted";

interface UiBadgeProps {
  readonly tone?: UiBadgeTone;
  readonly children: ReactNode;
  readonly className?: string;
}

export default function UiBadge(props: UiBadgeProps): ReactElement {
  const { tone = "primary", children, className = "" } = props;
  const variant: "primary" | "surface" = tone === "primary" ? "primary" : "surface";
  const active: boolean = tone === "primary";
  const mergedClassName: string = className;
  return (
    <PillButton as="span" variant={variant} size="xs" active={active} className={mergedClassName}>
      {children}
    </PillButton>
  );
}
