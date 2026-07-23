"use client";

import type { ChangeEvent, ReactElement } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import type { SettingsState, SettingsUpdateInput, ThemePreference } from "@miro/core";
import SettingsCard from "../ui/settings-card";

interface AppearanceCardProps {
  readonly appearance: SettingsState["appearance"];
  readonly onUpdate: (input: SettingsUpdateInput) => void;
}

function ThemeModeIcon(props: { readonly mode: ThemePreference }): ReactElement {
  const { mode } = props;
  const iconClassName = "h-3.5 w-3.5 shrink-0";
  if (mode === "light") {
    return <Sun className={iconClassName} aria-hidden="true" />;
  }
  if (mode === "dark") {
    return <Moon className={iconClassName} aria-hidden="true" />;
  }
  return <Monitor className={iconClassName} aria-hidden="true" />;
}

export default function AppearanceCard(props: AppearanceCardProps): ReactElement {
  const { appearance, onUpdate } = props;

  function handleThemeChange(event: ChangeEvent<HTMLInputElement>): void {
    const value = event.target.value as ThemePreference;
    onUpdate({ appearance: { theme: value } });
  }

  function handleCompactChange(event: ChangeEvent<HTMLInputElement>): void {
    onUpdate({ appearance: { compactLayout: event.target.checked } });
  }

  return (
    <SettingsCard
      title="Appearance"
      description="Theme and layout preferences for this device. Desktop chrome follows the same theme."
    >
      <div>
        <p className="text-sm font-semibold text-foreground">Theme</p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm" aria-label="Theme mode">
          {(["system", "light", "dark"] as const).map((mode) => {
            const active: boolean = appearance.theme === mode;
            const label: string =
              mode === "system" ? "System" : mode === "light" ? "Light" : "Dark";
            const baseClasses: string =
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors cursor-pointer";
            const activeClasses: string = `${baseClasses} bg-sky-500/10 font-medium text-sky-700 dark:text-sky-200`;
            const inactiveClasses: string =
              `${baseClasses} bg-surface-muted text-muted-foreground hover:bg-surface`;
            return (
              <label key={mode} className={active ? activeClasses : inactiveClasses}>
                <input
                  type="radio"
                  name="theme-mode"
                  value={mode}
                  checked={active}
                  onChange={handleThemeChange}
                  className="sr-only"
                />
                <ThemeModeIcon mode={mode} />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <label className="mt-4 flex items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          checked={appearance.compactLayout}
          onChange={handleCompactChange}
          className="mt-1 h-4 w-4 rounded border-surface bg-surface-muted text-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400"
        />
        <span>
          <span className="font-medium">Compact layout</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Slightly denser spacing in the chat shell (when supported by views).
          </span>
        </span>
      </label>

      <div className="mt-4 rounded-xl border border-surface bg-surface-muted p-4 text-sm text-muted-foreground">
        <p className="text-sm font-medium text-foreground">Preview</p>
        <div className="mt-2 flex gap-2">
          <div className="h-10 flex-1 rounded-lg bg-surface" />
          <div className="h-10 w-12 rounded-lg bg-surface" />
        </div>
      </div>
    </SettingsCard>
  );
}
