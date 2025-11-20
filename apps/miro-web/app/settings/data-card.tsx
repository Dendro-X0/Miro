"use client";

import type { ChangeEvent, ReactElement } from "react";
import type { SettingsState, SettingsUpdateInput } from "../_settings-store";
import SettingsCard from "../ui/settings-card";

interface DataCardProps {
  readonly data: SettingsState["data"];
  readonly onUpdate: (input: SettingsUpdateInput) => void;
  readonly onReset: () => void;
}

export default function DataCard(props: DataCardProps): ReactElement {
  const { data, onUpdate, onReset } = props;
  function handleClearByokKeys(): void {
    onUpdate({ aiView: { byokKey: "", byokProvider: null, byokLabel: "" } });
  }
  return (
    <SettingsCard title="Data &amp; storage">
      <div className="space-y-2 text-sm text-muted-foreground">
        <label className="flex items-center justify-between gap-3">
          <span>Store conversation history on this device</span>
          <input
            type="checkbox"
            checked={data.storeConversationHistory}
            onChange={(event: ChangeEvent<HTMLInputElement>): void =>
              onUpdate({ data: { storeConversationHistory: event.target.checked } })
            }
            className="h-4 w-4 rounded border-surface bg-surface-muted text-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400"
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
            className="h-4 w-4 rounded border-surface bg-surface-muted text-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400"
          />
        </label>
        <button
          type="button"
          onClick={onReset}
          className="mt-3 inline-flex items-center justify-center rounded-full border border-surface bg-surface-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:border-sky-400/80 hover:text-sky-200"
        >
          Reset settings to defaults
        </button>
        <div className="mt-4 space-y-2 border-t border-surface pt-3 text-sm">
          <p className="text-sm font-semibold text-foreground">Data tools</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-surface bg-surface-muted px-4 py-2 text-xs font-medium text-muted-foreground/70"
            >
              Clear local conversation history (coming soon)
            </button>
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-surface bg-surface-muted px-4 py-2 text-xs font-medium text-muted-foreground/70"
            >
              Clear cached AI configuration (coming soon)
            </button>
            <button
              type="button"
              onClick={handleClearByokKeys}
              className="inline-flex items-center justify-center rounded-full border border-surface bg-surface-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:border-sky-400/80 hover:text-sky-200"
            >
              Clear stored BYOK keys on this device
            </button>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
