export {
  MiroApiClient,
  consumeUiMessageStream,
  createMiroApiClient,
  readUiMessageStreamText,
} from "./api/miro-client";
export type {
  CreateMiroApiClientOptions,
  GenerateImageParams,
  GenerateImageResult,
  MiroApiClientOptions,
  StreamChatOptions,
  TranscribeAudioParams,
  TranscribeAudioResult,
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
export type { AgentSettings, MemoryEntry } from "./types/agent";
export type { ApiChatRequest, ApiUiMessage, ChatMessage, ChatRole } from "./types/chat";
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
export type { MiroBackupGalleryAsset, MiroBackupMessage, MiroBackupPayload, MiroBackupSession, MiroEncryptedBackupFile } from "./types/backup";
export { MIRO_BACKUP_VERSION } from "./types/backup";
export type { DesktopInfo, VaultGalleryAsset, VaultMessageRecord, VaultSessionSummary } from "./types/vault";
export {
  SETTINGS_STORAGE_KEY,
  applySettingsUpdate,
  defaultAgentSettings,
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
export {
  MULTIPART_PREFIX,
  deserializeMessageContent,
  formatGeneratedImageContent,
  getImageUrlFromMessageContent,
  getTextFromStoredContent,
  serializeMessageContent,
  supportsVisionProvider,
} from "./lib/message-parts";
export type {
  StoredImagePart,
  StoredMessagePart,
  StoredTextPart,
} from "./lib/message-parts";
export {
  backupExportFilename,
  decryptBackupPayload,
  encryptBackupPayload,
  parseEncryptedBackupJson,
} from "./lib/backup-crypto";
export {
  createMemoryEntry,
  createMemoryId,
  dedupeMemories,
  extractMemoryFromAssistantText,
  formatMemoriesForPrompt,
} from "./lib/memories";
export { chatExportFilename, formatChatMarkdown } from "./lib/export-chat";
export type { ChatMarkdownMessage } from "./lib/export-chat";
