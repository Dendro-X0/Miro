"use client";

import type { ChangeEvent, ReactElement } from "react";
import { useRef, useState } from "react";
import type { SettingsState, SettingsUpdateInput } from "@miro/core";
import SettingsCard from "../ui/settings-card";
import {
  clearWebChatHistory,
  exportBackupPayload,
  importBackupPayload,
  isEncryptedChatHistory,
} from "../lib/chat-history";
import {
  decryptBackupPayload,
  downloadBackupFile,
  encryptBackupPayload,
  readBackupFile,
} from "../lib/backup";

interface DataCardProps {
  readonly data: SettingsState["data"];
  readonly projects: SettingsState["projects"];
  readonly onUpdate: (input: SettingsUpdateInput) => void;
  readonly onReset: () => void;
}

export default function DataCard(props: DataCardProps): ReactElement {
  const { data, projects, onUpdate, onReset } = props;
  const [cleared, setCleared] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const encrypted = isEncryptedChatHistory();

  function handleClearByokKeys(): void {
    onUpdate({ aiView: { byokKey: "", byokProvider: null, byokLabel: "" } });
  }

  async function handleClearHistory(): Promise<void> {
    if (encrypted) {
      return;
    }
    await clearWebChatHistory();
    setCleared(true);
  }

  async function handleExportBackup(): Promise<void> {
    const passphrase = window.prompt("Choose a passphrase to encrypt this backup:");
    if (!passphrase || passphrase.trim().length < 8) {
      setBackupStatus("Passphrase must be at least 8 characters.");
      return;
    }
    setBackupBusy(true);
    setBackupStatus(null);
    try {
      const payload = await exportBackupPayload({
        projects: projects.items.map((project) => ({
          id: project.id,
          name: project.name,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          defaultComfyCheckpoint: project.defaultComfyCheckpoint ?? null,
        })),
        activeProjectId: projects.activeProjectId,
      });
      const file = await encryptBackupPayload(payload, passphrase.trim());
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBackupFile(`miro-backup-${stamp}.mirobackup.json`, file);
      setBackupStatus("Encrypted backup downloaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backup export failed";
      setBackupStatus(message);
    } finally {
      setBackupBusy(false);
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const passphrase = window.prompt("Enter the backup passphrase:");
    if (!passphrase) {
      return;
    }
    const confirmed = window.confirm(
      "Import replaces all chats, gallery items, and projects on this device. Continue?",
    );
    if (!confirmed) {
      return;
    }
    setBackupBusy(true);
    setBackupStatus(null);
    try {
      const encryptedFile = await readBackupFile(file);
      const payload = await decryptBackupPayload(encryptedFile, passphrase.trim());
      await importBackupPayload(payload);
      if (payload.projects) {
        onUpdate({
          projects: {
            items: payload.projects.map((project) => ({
              id: project.id,
              name: project.name,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
              defaultComfyCheckpoint: project.defaultComfyCheckpoint ?? null,
            })),
            activeProjectId: payload.activeProjectId ?? null,
          },
        });
      }
      setBackupStatus("Backup imported. Reload the app to see restored chats.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backup import failed";
      setBackupStatus(message);
    } finally {
      setBackupBusy(false);
      event.target.value = "";
    }
  }

  return (
    <SettingsCard title="Data &amp; storage">
      <div className="space-y-2 text-sm text-muted-foreground">
        <p className="text-xs leading-relaxed">
          {encrypted
            ? "Desktop: chats are stored in an encrypted SQLite vault; API keys use the OS keychain."
            : "Browser: chats are stored locally in this browser when history is enabled (not end-to-end encrypted)."}
        </p>
        <label className="flex items-center justify-between gap-3">
          <span>
            {encrypted
              ? "Conversation history (always on for encrypted vault)"
              : "Store conversation history on this device"}
          </span>
          <input
            type="checkbox"
            checked={encrypted ? true : data.storeConversationHistory}
            disabled={encrypted}
            onChange={(event: ChangeEvent<HTMLInputElement>): void =>
              onUpdate({ data: { storeConversationHistory: event.target.checked } })
            }
            className="h-4 w-4 rounded border-surface bg-surface-muted text-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-60"
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
              disabled={encrypted}
              onClick={() => void handleClearHistory()}
              className={
                encrypted
                  ? "inline-flex cursor-not-allowed items-center justify-center rounded-full border border-surface bg-surface-muted px-4 py-2 text-xs font-medium text-muted-foreground/70"
                  : "inline-flex items-center justify-center rounded-full border border-surface bg-surface-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:border-sky-400/80 hover:text-sky-200"
              }
            >
              {cleared ? "History cleared — reload chat" : "Clear local conversation history"}
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
        <div className="mt-4 space-y-2 border-t border-surface pt-3 text-sm">
          <p className="text-sm font-semibold text-foreground">Encrypted backup</p>
          <p className="text-xs leading-relaxed">
            Export or import chats, gallery, and projects as a passphrase-encrypted file. Works on
            desktop vault and browser local storage.
          </p>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.mirobackup.json,application/json"
            className="hidden"
            onChange={(event) => void handleImportFile(event)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={backupBusy}
              onClick={() => void handleExportBackup()}
              className="inline-flex items-center justify-center rounded-full border border-surface bg-surface-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:border-sky-400/80 hover:text-sky-200 disabled:opacity-60"
            >
              Export encrypted backup
            </button>
            <button
              type="button"
              disabled={backupBusy}
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center justify-center rounded-full border border-surface bg-surface-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:border-sky-400/80 hover:text-sky-200 disabled:opacity-60"
            >
              Import encrypted backup
            </button>
          </div>
          {backupStatus ? <p className="text-xs text-sky-300">{backupStatus}</p> : null}
        </div>
      </div>
    </SettingsCard>
  );
}
