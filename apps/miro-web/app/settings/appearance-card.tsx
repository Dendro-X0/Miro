"use client";

import type { ChangeEvent, ReactElement } from "react";
import type { SettingsState, ThemePreference } from "../_settings-store";
import SettingsCard from "../ui/settings-card";

interface AppearanceCardProps {
  readonly appearance: SettingsState["appearance"];
  readonly onThemeChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export default function AppearanceCard(props: AppearanceCardProps): ReactElement {
  const { appearance, onThemeChange } = props;
  return (
    <SettingsCard title="Appearance" description="Theme preferences for this device.">
      <div className="flex flex-wrap gap-2 text-sm" aria-label="Theme mode">
        {( ["system", "light", "dark"] as readonly ThemePreference[]).map((mode) => {
          const active: boolean = appearance.theme === mode;
          const label: string = mode === "system" ? "System" : mode === "light" ? "Light" : "Dark";
          const baseClasses: string =
            "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors";
          const activeClasses: string = `${baseClasses} bg-sky-500/10 font-medium text-sky-200`;
          const inactiveClasses: string = `${baseClasses} bg-surface-muted text-muted-foreground hover:bg-surface`;
          return (
            <label key={mode} className={active ? activeClasses : inactiveClasses}>
              <input
                type="radio"
                name="theme-mode"
                value={mode}
                checked={active}
                onChange={onThemeChange}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={
                  active
                    ? "h-1.5 w-1.5 rounded-full bg-sky-300"
                    : "h-1.5 w-1.5 rounded-full bg-surface"
                }
              />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
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
