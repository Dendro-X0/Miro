import type { AgentSettings } from "./agent";
import type { ProjectsSettings } from "./project";

export type { AgentSettings, MemoryEntry } from "./agent";
export type { ProjectsSettings, WorkspaceProject } from "./project";

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
  /** Empty string = follow selectedProviderId for image generation. */
  readonly selectedImageProviderId: string;
  /** Optional base URL for the image provider (e.g. ComfyUI :8188). */
  readonly imageBaseUrl: string;
  readonly byokProvider: string | null;
  readonly byokKey: string;
  readonly byokLabel: string;
  readonly modelFilterTag: AiModelFilterTag | null;
  readonly customModels: readonly AiCustomModel[];
  readonly defaultSystemPrompt: string;
  readonly byokBaseUrl: string;
}

export interface DataSettings {
  readonly storeConversationHistory: boolean;
  readonly sendUsageTelemetry: boolean;
}

export interface SettingsState {
  readonly profile: ProfileSettings;
  readonly appearance: AppearanceSettings;
  readonly aiView: AiViewSettings;
  readonly agent: AgentSettings;
  readonly projects: ProjectsSettings;
  readonly data: DataSettings;
}

export interface SettingsUpdateInput {
  readonly profile?: Partial<ProfileSettings>;
  readonly appearance?: Partial<AppearanceSettings>;
  readonly aiView?: Partial<AiViewSettings>;
  readonly agent?: Partial<AgentSettings>;
  readonly projects?: Partial<ProjectsSettings>;
  readonly data?: Partial<DataSettings>;
}
