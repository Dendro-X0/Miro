import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import {
  createMiroApiClient,
  type ApiUiMessage,
  type ChatMessage,
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
  type MobileChatSession,
} from "../src/lib/chat-sessions";

function toApiMessages(messages: readonly ChatMessage[]): readonly ApiUiMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
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

  const refreshSessions = useCallback(async (): Promise<readonly MobileChatSession[]> => {
    const next = await listSessions();
    setSessions(next);
    return next;
  }, []);

  const openSession = useCallback(async (sessionId: string): Promise<void> => {
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
      setBootstrapping(false);
    })();
    return () => {
      active = false;
    };
  }, [openSession, ready, refreshSessions]);

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

  const handleSend = useCallback(async (): Promise<void> => {
    if (sending || !activeSessionId) {
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now().toString(36)}`,
      role: "user",
      content: trimmed,
    };
    const nextMessages: readonly ChatMessage[] = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setSending(true);
    await saveMessage(activeSessionId, "user", trimmed);
    await refreshSessions();

    try {
      const assistantText = await apiClient.completeChat({
        messages: toApiMessages(nextMessages),
        model: settings.selectedModelId,
        provider: settings.selectedProviderId,
        byokKey: settings.byokKey || undefined,
        baseUrl: settings.apiBaseUrl || undefined,
      });

      if (!assistantText) {
        setError("Received an empty response from Miro.");
        return;
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now().toString(36)}`,
        role: "assistant",
        content: assistantText,
      };
      setMessages([...nextMessages, assistantMessage]);
      await saveMessage(activeSessionId, "assistant", assistantText);
      await refreshSessions();
    } catch {
      setError("Unable to reach Miro. Check API URL, key, and that @miro/api is running.");
    } finally {
      setSending(false);
    }
  }, [
    activeSessionId,
    apiClient,
    draft,
    messages,
    refreshSessions,
    sending,
    settings.apiBaseUrl,
    settings.byokKey,
    settings.selectedModelId,
    settings.selectedProviderId,
  ]);

  const disableSend = sending || draft.trim().length === 0 || !activeSessionId;
  const activeTitle =
    sessions.find((session) => session.id === activeSessionId)?.title ?? "Chat";

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
          <Text style={styles.title} numberOfLines={1}>
            {activeTitle}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {settings.selectedProviderId} · {settings.selectedModelId}
          </Text>
        </View>
        <Link href="/settings" asChild>
          <Pressable style={styles.headerChip}>
            <Text style={styles.headerChipText}>Settings</Text>
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Start a conversation</Text>
            <Text style={styles.emptySubtitle}>
              API {apiClient.getBaseUrl()} · BYOK {settings.byokKey ? "on" : "off"}
            </Text>
          </View>
        }
        renderItem={({ item }) => <ChatBubble message={item} />}
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Ask Miro..."
          placeholderTextColor="#64748b"
          value={draft}
          onChangeText={setDraft}
          editable={!sending}
          multiline
        />
        <Pressable
          style={[styles.sendButton, disableSend ? styles.sendButtonDisabled : null]}
          onPress={() => void handleSend()}
          disabled={disableSend}
        >
          {sending ? (
            <ActivityIndicator color="#020617" size="small" />
          ) : (
            <Text style={styles.sendLabel}>Send</Text>
          )}
        </Pressable>
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
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
  },
  title: {
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
  },
  headerChipText: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "600",
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
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#111827",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
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
