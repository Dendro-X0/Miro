import type {
  AgentSettings,
  AiViewSettings,
  AppearanceSettings,
  DataSettings,
  ProfileSettings,
  SettingsState,
} from "../types/settings";

export const SETTINGS_STORAGE_KEY = "miro-settings-v1";

export const defaultProfileSettings: ProfileSettings = {
  displayName: "Guest",
  avatarColor: "#0ea5e9",
  avatarImage: "",
  workspaceName: "Miro Studio",
};

export const defaultAppearanceSettings: AppearanceSettings = {
  theme: "system",
  accent: "sky",
  compactLayout: false,
};

export const defaultAiViewSettings: AiViewSettings = {
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
  defaultSystemPrompt: "",
  byokBaseUrl: "",
};

export const defaultAgentSettings: AgentSettings = {
  enableWebSearch: true,
  enableMemory: true,
  memories: [],
};

export const defaultDataSettings: DataSettings = {
  storeConversationHistory: true,
  sendUsageTelemetry: false,
};

export const defaultSettingsState: SettingsState = {
  profile: defaultProfileSettings,
  appearance: defaultAppearanceSettings,
  aiView: defaultAiViewSettings,
  agent: defaultAgentSettings,
  data: defaultDataSettings,
};
