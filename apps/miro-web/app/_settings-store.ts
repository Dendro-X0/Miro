"use client";

import {
  applySettingsUpdate,
  defaultSettingsState,
  parseStoredSettings,
  serializeSettings,
  SETTINGS_STORAGE_KEY,
  type SettingsState,
  type SettingsUpdateInput,
} from "@miro/core";
import { useEffect, useState } from "react";
import {
  isTauriDesktop,
  loadByokKeyFromKeychain,
  saveByokKeyToKeychain,
} from "./lib/tauri-desktop";

export type {
  AiCustomModel,
  AiModelFilterTag,
  AiViewSettings,
  AppearanceSettings,
  DataSettings,
  ProfileSettings,
  SettingsState,
  SettingsUpdateInput,
  ThemePreference,
} from "@miro/core";

interface UseSettingsResult {
  readonly settings: SettingsState;
  readonly updateSettings: (input: SettingsUpdateInput) => void;
  readonly resetSettings: () => void;
}

/** Hook for reading and updating local SettingsState using localStorage. */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<SettingsState>(defaultSettingsState);
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect((): void => {
    if (typeof window === "undefined") {
      return;
    }
    async function hydrateSettings(): Promise<void> {
      const raw: string | null = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      let stored: SettingsState = parseStoredSettings(raw) ?? defaultSettingsState;
      if (isTauriDesktop()) {
        const byokKey = await loadByokKeyFromKeychain();
        stored = {
          ...stored,
          aiView: {
            ...stored.aiView,
            byokKey,
          },
        };
      }
      setSettings(stored);
      setHydrated(true);
    }
    void hydrateSettings();
  }, []);

  useEffect((): void => {
    if (typeof window === "undefined" || !hydrated) {
      return;
    }
    try {
      const value: string = serializeSettings(settings, isTauriDesktop());
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, value);
    } catch {
      return;
    }
  }, [settings, hydrated]);

  function updateSettings(input: SettingsUpdateInput): void {
    if (isTauriDesktop() && input.aiView?.byokKey !== undefined) {
      void saveByokKeyToKeychain(input.aiView.byokKey);
    }
    setSettings((previous) => applySettingsUpdate(previous, input));
  }

  function resetSettings(): void {
    setSettings(defaultSettingsState);
  }

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
