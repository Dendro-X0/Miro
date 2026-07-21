export {
  MiroApiClient,
  createMiroApiClient,
  readUiMessageStreamText,
} from "./api/miro-client";
export type {
  CreateMiroApiClientOptions,
  GenerateImageParams,
  GenerateImageResult,
  MiroApiClientOptions,
  StreamChatOptions,
} from "./api/miro-client";
export { resolveMiroApiBaseUrl } from "./config/env";
export { miroApiPaths } from "./config/paths";
export type {
  AiConfigResponse,
  AiDiscoveredModel,
  AiModelsConfig,
  AiModelsListRequest,
  AiModelsListResponse,
  AiRuntimeConfig,
  AiRuntimeModel,
  AiRuntimeProvider,
} from "./types/ai-config";
export type { ApiChatRequest, ApiUiMessage, ChatMessage, ChatRole } from "./types/chat";
export type { MiroBackupGalleryAsset, MiroBackupMessage, MiroBackupPayload, MiroBackupSession, MiroEncryptedBackupFile } from "./types/backup";
export { MIRO_BACKUP_VERSION } from "./types/backup";
export type { DesktopInfo, VaultGalleryAsset, VaultMessageRecord, VaultSessionSummary } from "./types/vault";
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
} from "./types/settings";
export {
  SETTINGS_STORAGE_KEY,
  applySettingsUpdate,
  defaultAiViewSettings,
  defaultAppearanceSettings,
  defaultDataSettings,
  defaultProfileSettings,
  defaultSettingsState,
  mergeSettingsSection,
  normalizeAiViewSettings,
  parseStoredSettings,
  serializeSettings,
} from "./settings";
