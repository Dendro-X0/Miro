"use client";

import type { ChangeEvent, ReactElement } from "react";
import { useState } from "react";
import type { AgentSettings, MemoryEntry, SettingsUpdateInput } from "@miro/core";
import { createMemoryEntry } from "@miro/core";
import SettingsCard from "../ui/settings-card";

interface MemoryCardProps {
  readonly agent: AgentSettings;
  readonly onUpdate: (input: SettingsUpdateInput) => void;
}

export default function MemoryCard(props: MemoryCardProps): ReactElement {
  const { agent, onUpdate } = props;
  const [draft, setDraft] = useState<string>("");

  function handleToggleWebSearch(event: ChangeEvent<HTMLInputElement>): void {
    onUpdate({ agent: { enableWebSearch: event.target.checked } });
  }

  function handleToggleMemory(event: ChangeEvent<HTMLInputElement>): void {
    onUpdate({ agent: { enableMemory: event.target.checked } });
  }

  function handleAddMemory(): void {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    const next: MemoryEntry = createMemoryEntry(trimmed);
    onUpdate({ agent: { memories: [...agent.memories, next] } });
    setDraft("");
  }

  function handleRemoveMemory(memoryId: string): void {
    onUpdate({
      agent: {
        memories: agent.memories.filter((entry) => entry.id !== memoryId),
      },
    });
  }

  return (
    <SettingsCard
      title="Agent capabilities"
      description="Web search and personalized memory stay on this device. Memories are injected into the system prompt when enabled."
    >
      <div className="space-y-4">
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={agent.enableWebSearch}
            onChange={handleToggleWebSearch}
            className="mt-1 h-4 w-4 rounded border-surface bg-surface-muted text-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400"
          />
          <span>
            <span className="font-medium">Web search</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Let Miro search the public web for current information when needed.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={agent.enableMemory}
            onChange={handleToggleMemory}
            className="mt-1 h-4 w-4 rounded border-surface bg-surface-muted text-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400"
          />
          <span>
            <span className="font-medium">Personalized memory</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Saved facts are included in every chat. Ask Miro to remember something, or add
              entries below.
            </span>
          </span>
        </label>

        <div className="rounded-2xl border border-surface bg-surface-muted/50 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Saved memories</p>
          {agent.memories.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No memories yet. Try “Remember that I prefer concise answers.”
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {agent.memories.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-surface bg-surface px-3 py-2 text-sm"
                >
                  <span className="text-foreground">{entry.content}</span>
                  <button
                    type="button"
                    onClick={(): void => handleRemoveMemory(entry.id)}
                    className="shrink-0 text-xs text-muted-foreground hover:text-red-300"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                setDraft(event.target.value)
              }
              placeholder="Add a memory manually"
              className="flex-1 rounded-xl border border-surface bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            />
            <button
              type="button"
              onClick={handleAddMemory}
              className="rounded-full border border-surface bg-surface px-4 py-2 text-xs font-medium text-foreground hover:border-sky-400/80"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
