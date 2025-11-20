"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";

export type ThemePreference = "system" | "light" | "dark";

export interface ProfileSettings {
  readonly displayName: string;
  readonly avatarColor: string;
  readonly avatarImage: string;
  readonly workspaceName: string;
}

export interface AppearanceSettings {
  readonly theme: ThemePreference;
  readonly accent: string;
  readonly compactLayout: boolean;
}

export type AiModelFilterTag = "text" | "image" | "fast" | "quality" | "local";

export interface AiCustomModel {
  readonly id: string;
  readonly providerId: string;
  readonly label: string;
  readonly description: string;
  readonly tier: "default" | "fast" | "quality" | "local";
  readonly tags: readonly AiModelFilterTag[];
}

export interface AiViewSettings {
  readonly showProviderDetails: boolean;
  readonly showModelIds: boolean;
  readonly selectedProviderId: string;
  readonly selectedModelId: string;
  readonly selectedImageModelId: string;
  readonly byokProvider: string | null;
  readonly byokKey: string;
  readonly byokLabel: string;
  readonly modelFilterTag: AiModelFilterTag | null;
  readonly customModels: readonly AiCustomModel[];
}

export interface DataSettings {
  readonly storeConversationHistory: boolean;
  readonly sendUsageTelemetry: boolean;
}

export interface SettingsState {
  readonly profile: ProfileSettings;
  readonly appearance: AppearanceSettings;
  readonly aiView: AiViewSettings;
  readonly data: DataSettings;
}

export interface SettingsUpdateInput {
  readonly profile?: Partial<ProfileSettings>;
  readonly appearance?: Partial<AppearanceSettings>;
  readonly aiView?: Partial<AiViewSettings>;
  readonly data?: Partial<DataSettings>;
}

interface UseSettingsResult {
  readonly settings: SettingsState;
  readonly updateSettings: (input: SettingsUpdateInput) => void;
  readonly resetSettings: () => void;
}

const STORAGE_KEY: string = "miro-settings-v1";

const defaultProfile: ProfileSettings = {
  displayName: "Guest",
  avatarColor: "#0ea5e9",
  avatarImage: "",
  workspaceName: "Miro Studio",
};

const defaultAppearance: AppearanceSettings = {
  theme: "system",
  accent: "sky",
  compactLayout: false,
};

const defaultAiView: AiViewSettings = {
  showProviderDetails: true,
  showModelIds: false,
  selectedProviderId: "google",
  selectedModelId: "gemini-2.5-flash",
  selectedImageModelId: "",
  byokProvider: null,
  byokKey: "",
  byokLabel: "",
  modelFilterTag: null,
  customModels: [],
};

const defaultData: DataSettings = {
  storeConversationHistory: false,
  sendUsageTelemetry: false,
};

const defaultSettings: SettingsState = {
  profile: defaultProfile,
  appearance: defaultAppearance,
  aiView: defaultAiView,
  data: defaultData,
};

function mergeSection<TSection extends object>(
  previous: TSection,
  update: Partial<TSection> | undefined,
  fallback: TSection,
): TSection {
  if (!update) {
    return previous;
  }
  return { ...fallback, ...previous, ...update } as TSection;
}

function normalizeAiViewSettings(value: AiViewSettings): AiViewSettings {
  const legacyIds: readonly string[] = ["balanced", "fast"];
  const hasLegacyModelId: boolean = legacyIds.includes(value.selectedModelId);
  if (!hasLegacyModelId) {
    return value;
  }
  const nextProviderId: string =
    value.selectedProviderId === "openai-compatible" ? "google" : value.selectedProviderId;
  const next: AiViewSettings = {
    ...value,
    selectedProviderId: nextProviderId,
    selectedModelId: "gemini-2.5-flash",
  };
  return next;
}

function parseStoredSettings(raw: string | null): SettingsState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") {
      return null;
    }
    const record: Record<string, unknown> = parsed as Record<string, unknown>;
    const profileValue: ProfileSettings = mergeSection(
      defaultProfile,
      (record.profile as Partial<ProfileSettings> | undefined) ?? undefined,
      defaultProfile,
    );
    const appearanceValue: AppearanceSettings = mergeSection(
      defaultAppearance,
      (record.appearance as Partial<AppearanceSettings> | undefined) ?? undefined,
      defaultAppearance,
    );
    const mergedAiViewValue: AiViewSettings = mergeSection(
      defaultAiView,
      (record.aiView as Partial<AiViewSettings> | undefined) ?? undefined,
      defaultAiView,
    );
    const aiViewValue: AiViewSettings = normalizeAiViewSettings(mergedAiViewValue);
    const dataValue: DataSettings = mergeSection(
      defaultData,
      (record.data as Partial<DataSettings> | undefined) ?? undefined,
      defaultData,
    );
    const state: SettingsState = {
      profile: profileValue,
      appearance: appearanceValue,
      aiView: aiViewValue,
      data: dataValue,
    };
    return state;
  } catch {
    return null;
  }
}

/** Hook for reading and updating local SettingsState using localStorage. */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);

  useEffect((): void => {
    if (typeof window === "undefined") {
      return;
    }
    const raw: string | null = window.localStorage.getItem(STORAGE_KEY);
    const stored: SettingsState | null = parseStoredSettings(raw);
    if (stored) {
      setSettings(stored);
    }
  }, []);

  useEffect((): void => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const value: string = JSON.stringify(settings);
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      return;
    }
  }, [settings]);

  function updateSettings(input: SettingsUpdateInput): void {
    setSettings((previous: SettingsState): SettingsState => {
      const profile: ProfileSettings = mergeSection(
        previous.profile,
        input.profile,
        defaultProfile,
      );
      const appearance: AppearanceSettings = mergeSection(
        previous.appearance,
        input.appearance,
        defaultAppearance,
      );
      const aiView: AiViewSettings = mergeSection(
        previous.aiView,
        input.aiView,
        defaultAiView,
      );
      const data: DataSettings = mergeSection(previous.data, input.data, defaultData);
      const next: SettingsState = { profile, appearance, aiView, data };
      return next;
    });
  }

  function resetSettings(): void {
    setSettings(defaultSettings);
  }

  const result: UseSettingsResult = {
    settings,
    updateSettings,
    resetSettings,
  };
  return result;
}
