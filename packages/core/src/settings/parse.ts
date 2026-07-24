import {
  defaultAiViewSettings,
  defaultAgentSettings,
  defaultAppearanceSettings,
  defaultDataSettings,
  defaultProfileSettings,
  defaultProjectsSettings,
} from "./defaults";
import type {
  AiViewSettings,
  AgentSettings,
  ProfileSettings,
  ProjectsSettings,
  SettingsState,
  SettingsUpdateInput,
} from "../types/settings";

export function mergeSettingsSection<TSection extends object>(
  previous: TSection,
  update: Partial<TSection> | undefined,
  fallback: TSection,
): TSection {
  if (!update) {
    return previous;
  }
  return { ...fallback, ...previous, ...update } as TSection;
}

export function normalizeAiViewSettings(value: AiViewSettings): AiViewSettings {
  const legacyIds: readonly string[] = ["balanced", "fast"];
  if (!legacyIds.includes(value.selectedModelId)) {
    return value;
  }
  const nextProviderId =
    value.selectedProviderId === "openai-compatible" ? "google" : value.selectedProviderId;
  return {
    ...value,
    selectedProviderId: nextProviderId,
    selectedModelId: "gemini-2.5-flash",
  };
}

export function parseStoredSettings(raw: string | null): SettingsState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const profile = mergeSettingsSection(
      defaultProfileSettings,
      record.profile as Partial<ProfileSettings> | undefined,
      defaultProfileSettings,
    );
    const appearance = mergeSettingsSection(
      defaultAppearanceSettings,
      record.appearance as Partial<typeof defaultAppearanceSettings> | undefined,
      defaultAppearanceSettings,
    );
    const mergedAiView = mergeSettingsSection(
      defaultAiViewSettings,
      record.aiView as Partial<AiViewSettings> | undefined,
      defaultAiViewSettings,
    );
    const aiView = normalizeAiViewSettings(mergedAiView);
    const agent = mergeSettingsSection(
      defaultAgentSettings,
      record.agent as Partial<AgentSettings> | undefined,
      defaultAgentSettings,
    );
    const projects = mergeSettingsSection(
      defaultProjectsSettings,
      record.projects as Partial<ProjectsSettings> | undefined,
      defaultProjectsSettings,
    );
    const data = mergeSettingsSection(
      defaultDataSettings,
      record.data as Partial<typeof defaultDataSettings> | undefined,
      defaultDataSettings,
    );
    return { profile, appearance, aiView, agent, projects, data };
  } catch {
    return null;
  }
}

export function serializeSettings(settings: SettingsState, stripByokKey: boolean): string {
  if (!stripByokKey) {
    return JSON.stringify(settings);
  }
  return JSON.stringify({
    ...settings,
    aiView: {
      ...settings.aiView,
      byokKey: "",
    },
  });
}

export function applySettingsUpdate(
  previous: SettingsState,
  input: SettingsUpdateInput,
): SettingsState {
  return {
    profile: mergeSettingsSection(previous.profile, input.profile, defaultProfileSettings),
    appearance: mergeSettingsSection(
      previous.appearance,
      input.appearance,
      defaultAppearanceSettings,
    ),
    aiView: mergeSettingsSection(previous.aiView, input.aiView, defaultAiViewSettings),
    agent: mergeSettingsSection(previous.agent, input.agent, defaultAgentSettings),
    projects: mergeSettingsSection(previous.projects, input.projects, defaultProjectsSettings),
    data: mergeSettingsSection(previous.data, input.data, defaultDataSettings),
  };
}
