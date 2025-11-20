"use client";

import type { ReactElement, ReactNode } from "react";

type PillButtonVariant = "primary" | "surface";

type PillButtonSize = "xs" | "sm" | "md";

interface BuildPillClassesParams {
  readonly variant: PillButtonVariant;
  readonly size: PillButtonSize;
  readonly active: boolean;
}

type PillButtonAriaCurrent = "page" | "step" | "location" | "date" | "time";

interface PillButtonProps {
  readonly as?: "button" | "span";
  readonly variant: PillButtonVariant;
  readonly size: PillButtonSize;
  readonly active?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
  readonly type?: "button" | "submit";
  readonly disabled?: boolean;
  readonly onClick?: () => void;
  readonly ariaCurrent?: PillButtonAriaCurrent;
  readonly ariaPressed?: boolean;
}

function buildPillClasses(params: BuildPillClassesParams): string {
  const base: string =
    "inline-flex items-center justify-center gap-1 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
  let sizeClasses: string = "px-3 py-1 text-[11px]";
  if (params.size === "sm") {
    sizeClasses = "px-4 py-2 text-xs";
  } else if (params.size === "md") {
    sizeClasses = "px-5 py-2.5 text-sm";
  }
  let variantClasses: string;
  if (params.variant === "primary") {
    variantClasses = params.active
      ? "bg-sky-500/80 text-slate-900 dark:bg-sky-500/40 dark:text-sky-100"
      : "bg-surface-muted text-muted-foreground hover:bg-surface";
  } else {
    variantClasses = params.active
      ? "bg-sky-500/20 text-foreground"
      : "bg-surface-muted text-muted-foreground hover:bg-surface";
  }
  return `${base} ${sizeClasses} ${variantClasses}`;
}

/**
 * Reusable rounded pill used for chips and compact buttons.
 */
export default function PillButton(props: PillButtonProps): ReactElement {
  const {
    as = "button",
    variant,
    size,
    active = false,
    children,
    className = "",
    type = "button",
    disabled,
    onClick,
    ariaCurrent,
    ariaPressed,
  } = props;
  const classes: string = `${buildPillClasses({ variant, size, active })}${className ? ` ${className}` : ""}`;
  if (as === "span") {
    return (
      <span className={classes} aria-pressed={ariaPressed}>
        {children}
      </span>
    );
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes}
      aria-current={ariaCurrent}
      aria-pressed={ariaPressed}
    >
      {children}
    </button>
  );
}
