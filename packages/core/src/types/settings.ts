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
  /** Applied to every chat unless overridden per session. */
  readonly defaultSystemPrompt: string;
  /** Optional API base URL for BYOK gateways (OpenRouter, Groq, custom Ollama host, etc.). */
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
  readonly data: DataSettings;
}

export interface SettingsUpdateInput {
  readonly profile?: Partial<ProfileSettings>;
  readonly appearance?: Partial<AppearanceSettings>;
  readonly aiView?: Partial<AiViewSettings>;
  readonly data?: Partial<DataSettings>;
}
