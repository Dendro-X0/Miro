import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  createMiroApiClient,
  deserializeMessageContent,
  formatGeneratedImageContent,
  serializeMessageContent,
  supportsVisionProvider,
  type ApiUiMessage,
  type ChatMessage,
  type StoredMessagePart,
} from "@miro/core";
import { tokens } from "@miro/ui";
import { ChatBubble } from "../src/components/ChatBubble";
import { useMobileSettings } from "../src/settings-context";
import {
  createSession,
  deleteSession,
  listSessions,
  loadMessages,
  saveMessage,
  subscribeChatStore,
  type MobileChatSession,
} from "../src/lib/chat-sessions";
import { saveGalleryAsset } from "../src/lib/gallery";
import { shareActiveSessionMarkdown } from "../src/lib/share-export";
import { assertVisionDataUrlSize } from "../src/lib/storage-limits";

type AssistantMode = "chat" | "image";

function toApiMessages(messages: readonly ChatMessage[]): readonly ApiUiMessage[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => {
      const parts = deserializeMessageContent(message.content);
      const hasImage = parts.some((part) => part.type === "image");
      if (hasImage || parts.length > 1) {
        return { role: message.role, parts };
      }
      const text = parts[0]?.type === "text" ? parts[0].text : message.content;
      return { role: message.role, content: text };
    });
}

export default function ChatScreen(): ReactElement {
  const { settings, ready } = useMobileSettings();
  const apiClient = useMemo(
    () => createMiroApiClient({ baseUrl: settings.apiBaseUrl }),
    [settings.apiBaseUrl],
  );

  const [sessions, setSessions] = useState<readonly MobileChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [mode, setMode] = useState<AssistantMode>("chat");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  const visionOk = supportsVisionProvider(settings.selectedProviderId);

  const refreshSessions = useCallback(async (): Promise<readonly MobileChatSession[]> => {
    const next = await listSessions();
    setSessions(next);
    return next;
  }, []);

  const openSession = useCallback(async (sessionId: string): Promise<void> => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
    const records = await loadMessages(sessionId);
    setActiveSessionId(sessionId);
    setMessages(
      records.map((record) => ({
        id: record.id,
        role: record.role,
        content: record.content,
      })),
    );
    setSessionsOpen(false);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    let active = true;
    void (async () => {
      try {
        const existing = await refreshSessions();
        if (!active) {
          return;
        }
        if (existing.length > 0) {
          await openSession(existing[0].id);
        } else {
          const created = await createSession();
          await refreshSessions();
          await openSession(created.id);
        }
      } catch (caught) {
        if (active) {
          const detail = caught instanceof Error ? caught.message : "Failed to load chats";
          setError(detail);
        }
      } finally {
        if (active) {
          setBootstrapping(false);
        }
      }
    })();
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [openSession, ready, refreshSessions]);

  useEffect(() => {
    return subscribeChatStore(() => {
      void (async () => {
        const next = await refreshSessions();
        if (next.length === 0) {
          const created = await createSession();
          await refreshSessions();
          await openSession(created.id);
          return;
        }
        const stillActive = next.some((session) => session.id === activeSessionId);
        await openSession(stillActive ? activeSessionId : next[0].id);
      })();
    });
  }, [activeSessionId, openSession, refreshSessions]);

  async function handleNewChat(): Promise<void> {
    const created = await createSession();
    await refreshSessions();
    await openSession(created.id);
  }

  async function handleDeleteSession(sessionId: string): Promise<void> {
    await deleteSession(sessionId);
    const next = await refreshSessions();
    if (next.length === 0) {
      await handleNewChat();
      return;
    }
    if (sessionId === activeSessionId) {
      await openSession(next[0].id);
    }
  }

  function handleStop(): void {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  }

  async function handlePickImage(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is required to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    const asset = result.assets[0];
    const mime = asset.mimeType ?? "image/jpeg";
    if (!asset.base64) {
      setError("Could not read image data. Try another photo.");
      return;
    }
    const dataUrl = `data:${mime};base64,${asset.base64}`;
    try {
      assertVisionDataUrlSize(dataUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Image too large");
      return;
    }
    setPendingImage(dataUrl);
    setError(null);
    setMode("chat");
  }

  const streamAssistant = useCallback(
    async (
      historyForApi: readonly ChatMessage[],
      assistantId: string,
      sessionId: string,
    ): Promise<void> => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const assistantText = await apiClient.streamChatText(
          {
            messages: toApiMessages(historyForApi),
            model: settings.selectedModelId,
            provider: settings.selectedProviderId,
            byokKey: settings.byokKey || undefined,
            baseUrl: settings.byokBaseUrl.trim() || undefined,
            signal: controller.signal,
          },
          (_delta, assembled) => {
            setMessages((previous) =>
              previous.map((message) =>
                message.id === assistantId ? { ...message, content: assembled } : message,
              ),
            );
            requestAnimationFrame(() => {
              listRef.current?.scrollToEnd({ animated: false });
            });
          },
        );

        if (controller.signal.aborted) {
          return;
        }

        if (!assistantText.trim()) {
          setMessages((previous) => previous.filter((message) => message.id !== assistantId));
          setError("Received an empty response from Miro.");
          return;
        }

        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantId ? { ...message, content: assistantText } : message,
          ),
        );
        await saveMessage(sessionId, "assistant", assistantText, assistantId);
        await refreshSessions();
      } catch (caught) {
        if (controller.signal.aborted) {
          return;
        }
        setMessages((previous) =>
          previous.filter((message) => !(message.id === assistantId && !message.content.trim())),
        );
        const detail = caught instanceof Error ? caught.message : "Request failed";
        setError(
          `Unable to reach Miro (${detail}). Check API URL, key, and that @miro/api is running.`,
        );
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setSending(false);
      }
    },
    [
      apiClient,
      refreshSessions,
      settings.byokBaseUrl,
      settings.byokKey,
      settings.selectedModelId,
      settings.selectedProviderId,
    ],
  );

  const handleSend = useCallback(async (): Promise<void> => {
    if (sending || !activeSessionId) {
      return;
    }
    const trimmed = draft.trim();
    if (mode === "image") {
      if (!trimmed) {
        return;
      }
      const userMessage: ChatMessage = {
        id: `user-${Date.now().toString(36)}`,
        role: "user",
        content: trimmed,
      };
      const assistantId = `assistant-${Date.now().toString(36)}`;
      setMessages((previous) => [
        ...previous,
        userMessage,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setDraft("");
      setError(null);
      setSending(true);
      await saveMessage(activeSessionId, "user", trimmed, userMessage.id);
      await refreshSessions();

      try {
        const result = await apiClient.generateImage({
          prompt: trimmed,
          model: settings.selectedImageModelId,
          provider: settings.selectedProviderId,
          byokKey: settings.byokKey || undefined,
          baseUrl: settings.byokBaseUrl.trim() || undefined,
        });
        const imageUrl = result.images[0]?.url;
        if (!imageUrl) {
          setMessages((previous) => previous.filter((message) => message.id !== assistantId));
          setError("Image generation returned no images.");
          return;
        }
        const content = formatGeneratedImageContent(imageUrl);
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantId ? { ...message, content } : message,
          ),
        );
        await saveMessage(activeSessionId, "assistant", content, assistantId);
        await saveGalleryAsset({
          prompt: trimmed,
          dataUrl: imageUrl,
          sessionId: activeSessionId,
        });
        await refreshSessions();
      } catch (caught) {
        setMessages((previous) =>
          previous.filter((message) => !(message.id === assistantId && !message.content.trim())),
        );
        const detail = caught instanceof Error ? caught.message : "Request failed";
        setError(`Image generation failed (${detail}).`);
      } finally {
        setSending(false);
      }
      return;
    }

    if (!trimmed && !pendingImage) {
      return;
    }

    const prompt = trimmed || (pendingImage ? "What's in this image?" : "");
    const parts: StoredMessagePart[] = pendingImage
      ? [
          { type: "text", text: prompt },
          { type: "image", image: pendingImage },
        ]
      : [{ type: "text", text: prompt }];
    const storedContent = serializeMessageContent(parts);
    const userMessage: ChatMessage = {
      id: `user-${Date.now().toString(36)}`,
      role: "user",
      content: storedContent,
    };
    const assistantId = `assistant-${Date.now().toString(36)}`;
    const nextMessages: readonly ChatMessage[] = [...messages, userMessage];
    setMessages([
      ...nextMessages,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setDraft("");
    setPendingImage(null);
    setError(null);
    setSending(true);
    await saveMessage(activeSessionId, "user", storedContent, userMessage.id);
    await refreshSessions();
    await streamAssistant(nextMessages, assistantId, activeSessionId);
  }, [
    activeSessionId,
    apiClient,
    draft,
    messages,
    mode,
    pendingImage,
    refreshSessions,
    sending,
    settings.byokBaseUrl,
    settings.byokKey,
    settings.selectedImageModelId,
    settings.selectedProviderId,
    streamAssistant,
  ]);

  const disableSend =
    sending ||
    !activeSessionId ||
    (mode === "image" ? draft.trim().length === 0 : draft.trim().length === 0 && !pendingImage);
  const activeTitle =
    sessions.find((session) => session.id === activeSessionId)?.title ?? "Chat";

  async function handleExportMarkdown(): Promise<void> {
    if (!activeSessionId || exportBusy) {
      return;
    }
    setExportBusy(true);
    setError(null);
    try {
      await shareActiveSessionMarkdown(activeSessionId, activeTitle);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : "Export failed";
      setError(detail);
    } finally {
      setExportBusy(false);
    }
  }

  if (!ready || bootstrapping) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.headerChip} onPress={() => setSessionsOpen(true)}>
          <Text style={styles.headerChipText}>Chats</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.brand}>Miro</Text>
          <Text style={styles.title} numberOfLines={1}>
            {activeTitle}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {settings.selectedProviderId} ·{" "}
            {mode === "image" ? settings.selectedImageModelId : settings.selectedModelId}
          </Text>
        </View>
        <Link href="/gallery" asChild>
          <Pressable style={styles.headerChip}>
            <Text style={styles.headerChipText}>Gallery</Text>
          </Pressable>
        </Link>
        <Pressable
          style={styles.headerChip}
          onPress={() => void handleExportMarkdown()}
          disabled={exportBusy || messages.length === 0}
        >
          <Text style={styles.headerChipText}>{exportBusy ? "…" : "MD"}</Text>
        </Pressable>
        <Link href="/settings" asChild>
          <Pressable style={styles.headerChip}>
            <Text style={styles.headerChipText}>Settings</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, mode === "chat" ? styles.modeChipActive : null]}
          onPress={() => setMode("chat")}
        >
          <Text style={[styles.modeChipText, mode === "chat" ? styles.modeChipTextActive : null]}>
            Chat
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, mode === "image" ? styles.modeChipActive : null]}
          onPress={() => {
            setMode("image");
            setPendingImage(null);
          }}
        >
          <Text style={[styles.modeChipText, mode === "image" ? styles.modeChipTextActive : null]}>
            Image
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Start a conversation</Text>
            <Text style={styles.emptySubtitle}>
              API {apiClient.getBaseUrl()} · BYOK {settings.byokKey ? "on" : "off"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ChatBubble
            message={item}
            streaming={
              sending &&
              item.role === "assistant" &&
              item.id === messages[messages.length - 1]?.id
            }
          />
        )}
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {pendingImage ? (
        <View style={styles.attachPreview}>
          <Image source={{ uri: pendingImage }} style={styles.attachThumb} />
          <Text style={styles.attachLabel} numberOfLines={1}>
            Image attached
          </Text>
          <Pressable onPress={() => setPendingImage(null)}>
            <Text style={styles.clearAttach}>Remove</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        {mode === "chat" && visionOk ? (
          <Pressable
            style={styles.attachButton}
            onPress={() => void handlePickImage()}
            disabled={sending}
          >
            <Text style={styles.attachButtonText}>＋</Text>
          </Pressable>
        ) : null}
        <TextInput
          style={styles.input}
          placeholder={mode === "image" ? "Describe an image…" : "Ask Miro..."}
          placeholderTextColor="#64748b"
          value={draft}
          onChangeText={setDraft}
          editable={!sending}
          multiline
        />
        {sending ? (
          <Pressable style={styles.stopButton} onPress={handleStop}>
            <Text style={styles.stopLabel}>Stop</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.sendButton, disableSend ? styles.sendButtonDisabled : null]}
            onPress={() => void handleSend()}
            disabled={disableSend}
          >
            <Text style={styles.sendLabel}>{mode === "image" ? "Generate" : "Send"}</Text>
          </Pressable>
        )}
      </View>

      <Modal visible={sessionsOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chats</Text>
              <Pressable onPress={() => setSessionsOpen(false)}>
                <Text style={styles.link}>Close</Text>
              </Pressable>
            </View>
            <Pressable style={styles.primaryButton} onPress={() => void handleNewChat()}>
              <Text style={styles.primaryButtonText}>New chat</Text>
            </Pressable>
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.sessionList}
              renderItem={({ item }) => {
                const active = item.id === activeSessionId;
                return (
                  <View style={[styles.sessionRow, active ? styles.sessionRowActive : null]}>
                    <Pressable style={styles.sessionMain} onPress={() => void openSession(item.id)}>
                      <Text style={styles.sessionTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => void handleDeleteSession(item.id)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#38bdf8",
  },
  title: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#94a3b8",
  },
  headerChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
  },
  headerChipText: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "600",
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#020617",
  },
  modeChipActive: {
    borderColor: "#0ea5e9",
    backgroundColor: "rgba(14,165,233,0.15)",
  },
  modeChipText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  modeChipTextActive: {
    color: "#e0f2fe",
  },
  messages: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexGrow: 1,
  },
  emptyState: {
    paddingVertical: 48,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e5e7eb",
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
  },
  errorBanner: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#7f1d1d",
  },
  errorText: {
    color: "#fee2e2",
    fontSize: 12,
    textAlign: "center",
  },
  attachPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
  },
  attachThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  attachLabel: {
    flex: 1,
    fontSize: 12,
    color: "#94a3b8",
  },
  clearAttach: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f87171",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#111827",
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  attachButtonText: {
    color: "#e5e7eb",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 22,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#e5e7eb",
    fontSize: 14,
  },
  sendButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: tokens.colors.primary,
    minWidth: 72,
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#1e293b",
  },
  sendLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#020617",
  },
  stopButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#7f1d1d",
    minWidth: 72,
    alignItems: "center",
  },
  stopLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fee2e2",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.7)",
  },
  modalSheet: {
    maxHeight: "70%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#0b0b0c",
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  link: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
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
  sessionList: {
    gap: 8,
    paddingBottom: 24,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sessionRowActive: {
    borderColor: "#0ea5e9",
    backgroundColor: "rgba(14,165,233,0.12)",
  },
  sessionMain: {
    flex: 1,
  },
  sessionTitle: {
    color: "#e5e7eb",
    fontSize: 14,
  },
  deleteText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "600",
  },
});
