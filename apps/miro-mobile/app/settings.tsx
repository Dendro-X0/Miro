import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createMiroApiClient, type AiDiscoveredModel } from "@miro/core";
import { tokens } from "@miro/ui";
import { useMobileSettings } from "../src/settings-context";

export default function SettingsScreen(): ReactElement {
  const { settings, ready, updateSettings } = useMobileSettings();
  const [draftKey, setDraftKey] = useState("");
  const [draftBaseUrl, setDraftBaseUrl] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [models, setModels] = useState<readonly AiDiscoveredModel[]>([]);
  const [providers, setProviders] = useState<readonly { id: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    setDraftKey(settings.byokKey);
    setDraftBaseUrl(settings.apiBaseUrl);
    setDraftLabel(settings.byokLabel);
  }, [ready, settings.apiBaseUrl, settings.byokKey, settings.byokLabel]);

  const client = useMemo(
    () => createMiroApiClient({ baseUrl: settings.apiBaseUrl }),
    [settings.apiBaseUrl],
  );

  const refreshCatalog = useCallback(async (): Promise<void> => {
    setBusy(true);
    setStatus(null);
    try {
      const config = await client.fetchConfig();
      const runtimeProviders = (config.runtime?.providers ?? [])
        .filter((provider) => provider.id !== "openai")
        .map((provider) => ({ id: provider.id, label: provider.label }));
      setProviders(runtimeProviders);

      const listed = await client.listModels({
        provider: settings.selectedProviderId,
        byokKey: settings.byokKey || undefined,
        baseUrl: settings.apiBaseUrl || undefined,
      });
      const textModels = listed.models.filter((model) => model.kind !== "image");
      setModels(textModels);
      if (listed.error) {
        setStatus(listed.error);
      } else if (textModels.length === 0) {
        setStatus("No models discovered — enter a model ID manually or check your key.");
      } else {
        setStatus(`Loaded ${textModels.length} models.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load models";
      setStatus(message);
      setModels([]);
    } finally {
      setBusy(false);
    }
  }, [client, settings.apiBaseUrl, settings.byokKey, settings.selectedProviderId]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void refreshCatalog();
  }, [ready, refreshCatalog]);

  async function handleSave(): Promise<void> {
    await updateSettings({
      byokKey: draftKey.trim(),
      apiBaseUrl: draftBaseUrl.trim() || settings.apiBaseUrl,
      byokLabel: draftLabel.trim(),
    });
    setStatus("Saved. Keys stay in SecureStore on this device.");
  }

  if (!ready) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={tokens.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.label}>API base URL</Text>
          <TextInput
            style={styles.input}
            value={draftBaseUrl}
            onChangeText={setDraftBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://127.0.0.1:8787"
            placeholderTextColor="#64748b"
          />
          <Text style={styles.hint}>
            Android emulator: http://10.0.2.2:8787 · Device: your LAN IP + :8787
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>BYOK API key</Text>
          <TextInput
            style={styles.input}
            value={draftKey}
            onChangeText={setDraftKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="sk-..."
            placeholderTextColor="#64748b"
          />
          <TextInput
            style={[styles.input, styles.mt8]}
            value={draftLabel}
            onChangeText={setDraftLabel}
            placeholder="Label (optional)"
            placeholderTextColor="#64748b"
          />
          <Pressable style={styles.primaryButton} onPress={() => void handleSave()}>
            <Text style={styles.primaryButtonText}>Save credentials</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Provider</Text>
            <Pressable onPress={() => void refreshCatalog()} disabled={busy}>
              <Text style={styles.link}>{busy ? "Refreshing…" : "Refresh models"}</Text>
            </Pressable>
          </View>
          <View style={styles.chipRow}>
            {(providers.length > 0
              ? providers
              : [
                  { id: "openai-compatible", label: "OpenAI compatible" },
                  { id: "google", label: "Google" },
                  { id: "anthropic", label: "Anthropic" },
                  { id: "local", label: "Local" },
                ]
            ).map((provider) => {
              const active = provider.id === settings.selectedProviderId;
              return (
                <Pressable
                  key={provider.id}
                  style={[styles.chip, active ? styles.chipActive : null]}
                  onPress={() => void updateSettings({ selectedProviderId: provider.id })}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                    {provider.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Model</Text>
          <TextInput
            style={styles.input}
            value={settings.selectedModelId}
            onChangeText={(value) => void updateSettings({ selectedModelId: value })}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="model id"
            placeholderTextColor="#64748b"
          />
          <View style={styles.chipRow}>
            {models.slice(0, 24).map((model) => {
              const active = model.id === settings.selectedModelId;
              return (
                <Pressable
                  key={model.id}
                  style={[styles.chip, active ? styles.chipActive : null]}
                  onPress={() => void updateSettings({ selectedModelId: model.id })}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                    {model.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#e5e7eb",
    fontSize: 14,
  },
  mt8: {
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: "#020617",
    fontWeight: "600",
    fontSize: 13,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  link: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#020617",
  },
  chipActive: {
    borderColor: "#0ea5e9",
    backgroundColor: "rgba(14,165,233,0.15)",
  },
  chipText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  chipTextActive: {
    color: "#e0f2fe",
    fontWeight: "600",
  },
  status: {
    marginTop: 8,
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 18,
  },
});
