import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { resolveMiroApiBaseUrl } from "@miro/core";

const SETTINGS_KEY = "miro-mobile-settings-v1";
const BYOK_SECURE_KEY = "miro-byok-api-key";

export interface MobileAiSettings {
  readonly apiBaseUrl: string;
  /** Optional OpenAI-compatible / gateway URL for BYOK (not the Miro API host). */
  readonly byokBaseUrl: string;
  readonly selectedProviderId: string;
  readonly selectedModelId: string;
  readonly selectedImageModelId: string;
  readonly byokKey: string;
  readonly byokLabel: string;
}

export type MobileAiSettingsUpdate = Partial<MobileAiSettings>;

export function defaultMobileAiSettings(): MobileAiSettings {
  return {
    apiBaseUrl: resolveMiroApiBaseUrl(),
    byokBaseUrl: "",
    selectedProviderId: "openai-compatible",
    selectedModelId: "gpt-4o-mini",
    selectedImageModelId: "dall-e-3",
    byokKey: "",
    byokLabel: "",
  };
}

async function readByokKey(): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(BYOK_SECURE_KEY)) ?? "";
  } catch {
    return "";
  }
}

export async function loadMobileAiSettings(): Promise<MobileAiSettings> {
  const defaults = defaultMobileAiSettings();
  const byokKey = await readByokKey();
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...defaults, byokKey };
    }
    const parsed = JSON.parse(raw) as Partial<MobileAiSettings>;
    return {
      apiBaseUrl: parsed.apiBaseUrl?.trim() || defaults.apiBaseUrl,
      byokBaseUrl: parsed.byokBaseUrl?.trim() ?? "",
      selectedProviderId: parsed.selectedProviderId || defaults.selectedProviderId,
      selectedModelId: parsed.selectedModelId || defaults.selectedModelId,
      selectedImageModelId: parsed.selectedImageModelId || defaults.selectedImageModelId,
      byokKey,
      byokLabel: parsed.byokLabel ?? "",
    };
  } catch {
    // Preserve SecureStore key even when AsyncStorage JSON is corrupt.
    return { ...defaults, byokKey };
  }
}

export async function saveMobileAiSettings(settings: MobileAiSettings): Promise<void> {
  const trimmedKey = settings.byokKey.trim();
  if (trimmedKey) {
    await SecureStore.setItemAsync(BYOK_SECURE_KEY, trimmedKey);
  } else {
    await SecureStore.deleteItemAsync(BYOK_SECURE_KEY);
  }
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      apiBaseUrl: settings.apiBaseUrl,
      byokBaseUrl: settings.byokBaseUrl,
      selectedProviderId: settings.selectedProviderId,
      selectedModelId: settings.selectedModelId,
      selectedImageModelId: settings.selectedImageModelId,
      byokLabel: settings.byokLabel,
    }),
  );
}
