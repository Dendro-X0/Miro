"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";

const storageKey: string = "miro-theme";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  const stored: string | null = localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  const prefersDark: boolean = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

/** Toggle between light and dark color schemes. */
export interface ThemeToggleProps {
	readonly compact?: boolean;
}

export default function ThemeToggle(props: ThemeToggleProps): ReactElement {
  const { compact } = props;
  const [theme, setTheme] = useState<ThemeMode>("light");
  const isDark: boolean = theme === "dark";

  const applyTheme = useCallback((next: ThemeMode): void => {
    setTheme(next);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, next);
    }
  }, []);

  useEffect((): void => {
    const nextTheme: ThemeMode = getInitialTheme();
    setTheme(nextTheme);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
    }
  }, []);

  function handleToggle(): void {
    const nextTheme: ThemeMode = isDark ? "light" : "dark";
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={isDark}
      aria-label={compact ? "Toggle color mode" : undefined}
      className={
        compact
          ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface bg-surface text-xs font-medium text-foreground shadow-lg backdrop-blur hover:border-sky-400/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          : "inline-flex items-center gap-2 rounded-full border border-surface bg-surface px-3.5 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur hover:border-sky-400/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      }
    >
      {compact ? (
        isDark ? (
          <Moon className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Sun className="h-3.5 w-3.5" aria-hidden="true" />
        )
      ) : (
        <>
          <Sun
            className={`h-3.5 w-3.5 transition-opacity ${isDark ? "opacity-40" : "opacity-100"}`}
            aria-hidden="true"
          />
          <Moon
            className={`h-3.5 w-3.5 transition-opacity ${isDark ? "opacity-100" : "opacity-40"}`}
            aria-hidden="true"
          />
          <span>{isDark ? "Dark" : "Light"} mode</span>
        </>
      )}
    </button>
  );
}
