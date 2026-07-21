import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { resolveMiroApiBaseUrl } from "@miro/core";

const SETTINGS_KEY = "miro-mobile-settings-v1";
const BYOK_SECURE_KEY = "miro-byok-api-key";

export interface MobileAiSettings {
  readonly apiBaseUrl: string;
  readonly selectedProviderId: string;
  readonly selectedModelId: string;
  readonly byokKey: string;
  readonly byokLabel: string;
}

export type MobileAiSettingsUpdate = Partial<MobileAiSettings>;

export function defaultMobileAiSettings(): MobileAiSettings {
  return {
    apiBaseUrl: resolveMiroApiBaseUrl(),
    selectedProviderId: "openai-compatible",
    selectedModelId: "gpt-4o-mini",
    byokKey: "",
    byokLabel: "",
  };
}

export async function loadMobileAiSettings(): Promise<MobileAiSettings> {
  const defaults = defaultMobileAiSettings();
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const byokKey = (await SecureStore.getItemAsync(BYOK_SECURE_KEY)) ?? "";
    if (!raw) {
      return { ...defaults, byokKey };
    }
    const parsed = JSON.parse(raw) as Partial<MobileAiSettings>;
    return {
      apiBaseUrl: parsed.apiBaseUrl?.trim() || defaults.apiBaseUrl,
      selectedProviderId: parsed.selectedProviderId || defaults.selectedProviderId,
      selectedModelId: parsed.selectedModelId || defaults.selectedModelId,
      byokKey,
      byokLabel: parsed.byokLabel ?? "",
    };
  } catch {
    return defaults;
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
      selectedProviderId: settings.selectedProviderId,
      selectedModelId: settings.selectedModelId,
      byokLabel: settings.byokLabel,
    }),
  );
}
