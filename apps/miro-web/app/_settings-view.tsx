"use client";

import type { ChangeEvent, ReactElement } from "react";
import type { SettingsState, SettingsUpdateInput, ThemePreference } from "./_settings-store";

interface SettingsViewProps {
  readonly settings: SettingsState;
  readonly onUpdate: (input: SettingsUpdateInput) => void;
  readonly onReset: () => void;
}

function applyThemePreference(mode: ThemePreference): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const storageKey: string = "miro-theme";
  if (mode === "system") {
    window.localStorage.removeItem(storageKey);
    const prefersDark: boolean = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", prefersDark);
    return;
  }
  const isDark: boolean = mode === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  window.localStorage.setItem(storageKey, mode);
}

export default function SettingsView(props: SettingsViewProps): ReactElement {
  const { settings, onUpdate, onReset } = props;
  const { profile, appearance, aiView, data } = settings;

  function handleThemeChange(event: ChangeEvent<HTMLInputElement>): void {
    const value: string = event.target.value;
    const mode: ThemePreference = value === "light" || value === "dark" ? value : "system";
    applyThemePreference(mode);
    onUpdate({ appearance: { theme: mode } });
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 pb-4" aria-label="Settings">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">Workspace</p>
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        </div>
      </div>
      <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col gap-3">
          <div className="surface-panel rounded-2xl p-4 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">Profile</h3>
            <p className="mt-1 text-xs text-muted-foreground">Local to this device only.</p>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-medium text-muted-foreground">
                Display name
                <input
                  type="text"
                  defaultValue={profile.displayName}
                  onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                    onUpdate({ profile: { displayName: event.target.value } })
                  }
                  className="mt-1 w-full rounded-xl border border-surface bg-surface-muted px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                />
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                Workspace label
                <input
                  type="text"
                  defaultValue={profile.workspaceName}
                  onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                    onUpdate({ profile: { workspaceName: event.target.value } })
                  }
                  className="mt-1 w-full rounded-xl border border-surface bg-surface-muted px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                />
              </label>
            </div>
          </div>
          <div className="surface-panel rounded-2xl p-4 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">Appearance</h3>
            <p className="mt-1 text-xs text-muted-foreground">Theme preferences for this device.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {(["system", "light", "dark"] as readonly ThemePreference[]).map((mode) => {
                const active: boolean = appearance.theme === mode;
                const label: string = mode === "system" ? "System" : mode === "light" ? "Light" : "Dark";
                return (
                  <label
                    key={mode}
                    className={
                      active
                        ? "flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-200"
                        : "flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1 text-[11px] text-muted-foreground hover:bg-surface"
                    }
                  >
                    <input
                      type="radio"
                      name="theme-mode"
                      value={mode}
                      checked={active}
                      onChange={handleThemeChange}
                      className="sr-only"
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <div className="surface-panel rounded-2xl p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">AI & keys</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Managed via environment variables in the API for now. This panel will grow as more providers and
              keys are supported.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li>Provider configuration is read from the backend /ai/config endpoint.</li>
              <li>Bring-your-own key will be added here in a future release.</li>
            </ul>
          </div>
          <div className="surface-panel rounded-2xl p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">Data & storage</h3>
            <div className="mt-2 space-y-2 text-xs text-muted-foreground">
              <label className="flex items-center justify-between gap-3">
                <span>Store conversation history on this device</span>
                <input
                  type="checkbox"
                  checked={data.storeConversationHistory}
                  onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                    onUpdate({ data: { storeConversationHistory: event.target.checked } })
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>Allow anonymous usage telemetry</span>
                <input
                  type="checkbox"
                  checked={data.sendUsageTelemetry}
                  onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                    onUpdate({ data: { sendUsageTelemetry: event.target.checked } })
                  }
                />
              </label>
              <button
                type="button"
                onClick={onReset}
                className="mt-2 inline-flex items-center justify-center rounded-full border border-surface bg-surface-muted px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:border-sky-400/80 hover:text-sky-200"
              >
                Reset settings to defaults
              </button>
            </div>
          </div>
          <div className="surface-panel rounded-2xl p-4 text-xs text-muted-foreground">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">About</h3>
            <p className="mt-1">
              Miro AI Workspace is an experimental, open-source generative workspace. This build is intended for
              local use and self-hosting; authentication and subscriptions will arrive in a future version.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
