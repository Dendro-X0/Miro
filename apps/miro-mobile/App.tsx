import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import type { ReactElement } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface UiChatMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
}

interface BackendChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

interface BackendChatCompletionChoice {
  readonly index?: number;
  readonly message: BackendChatMessage;
}

interface BackendChatCompletion {
  readonly choices: readonly BackendChatCompletionChoice[];
}

interface AiChatResponseBody {
  readonly completion: BackendChatCompletion;
}

const defaultApiBaseUrl: string =
  process.env.EXPO_PUBLIC_MIRO_API_BASE_URL ?? "http://localhost:8787";
const systemPrompt: string = "You are the Miro workspace assistant.";

function buildBackendMessages(messages: readonly UiChatMessage[]): readonly BackendChatMessage[] {
  const systemMessage: BackendChatMessage = { role: "system", content: systemPrompt };
  const chatMessages: readonly BackendChatMessage[] = messages.map((message: UiChatMessage): BackendChatMessage => {
    const role: "user" | "assistant" = message.role;
    return { role, content: message.content };
  });
  return [systemMessage, ...chatMessages];
}

/** Root application component for the Miro mobile client. */
export default function App(): ReactElement {
  const [messages, setMessages] = useState<readonly UiChatMessage[]>([]);
  const [value, setValue] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(): Promise<void> {
    if (sending) {
      return;
    }
    const trimmed: string = value.trim();
    if (!trimmed) {
      return;
    }
    const userMessage: UiChatMessage = {
      id: `user-${Date.now().toString(10)}`,
      role: "user",
      content: trimmed,
    };
    const nextMessages: readonly UiChatMessage[] = [...messages, userMessage];
    setMessages(nextMessages);
    setValue("");
    setError(null);
    setSending(true);
    try {
      const backendMessages: readonly BackendChatMessage[] = buildBackendMessages(nextMessages);
      const response: Response = await fetch(`${defaultApiBaseUrl}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: backendMessages }),
      });
      if (!response.ok) {
        setError("Unable to reach Miro right now. Please try again.");
        return;
      }
      const body: AiChatResponseBody = (await response.json()) as AiChatResponseBody;
      const firstChoice: BackendChatCompletionChoice | undefined = body.completion.choices[0];
      const assistantContent: string | undefined = firstChoice?.message.content;
      if (!assistantContent) {
        setError("Received an empty response from Miro. Please try again.");
        return;
      }
      const assistantMessage: UiChatMessage = {
        id: `assistant-${Date.now().toString(10)}`,
        role: "assistant",
        content: assistantContent,
      };
      setMessages([...nextMessages, assistantMessage]);
    } catch {
      setError("Something went wrong while talking to Miro.");
      return;
    } finally {
      setSending(false);
    }
  }

  function handleChange(text: string): void {
    setValue(text);
  }

  const disableSend: boolean = sending || value.trim().length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Miro workspace</Text>
        <Text style={styles.subtitle}>Ask anything about your projects or activity.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.messagesContainer}>
        {messages.map((message: UiChatMessage): ReactElement => {
          const isUser: boolean = message.role === "user";
          return (
            <View
              key={message.id}
              style={isUser ? styles.userBubbleContainer : styles.assistantBubbleContainer}
            >
              <View style={isUser ? styles.userBubble : styles.assistantBubble}>
                <Text style={isUser ? styles.userText : styles.assistantText}>{message.content}</Text>
              </View>
            </View>
          );
        })}
        {messages.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyTitle}>Ask anything, just like in your favorite chat apps.</Text>
            <Text style={styles.emptySubtitle}>
              Use the box below to explore boards, plan projects, or get quick answers about what is
              happening in your workspace.
            </Text>
          </View>
        )}
      </ScrollView>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask Miro about your workspace..."
          placeholderTextColor="#64748b"
          value={value}
          onChangeText={handleChange}
          editable={!sending}
        />
        <TouchableOpacity
          style={disableSend ? styles.sendButtonDisabled : styles.sendButton}
          onPress={handleSend}
          disabled={disableSend}
        >
          <Text style={styles.sendButtonLabel}>{sending ? "..." : "Send"}</Text>
        </TouchableOpacity>
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#94a3b8",
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  userBubbleContainer: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  assistantBubbleContainer: {
    alignItems: "flex-start",
    marginBottom: 8,
  },
  userBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0ea5e9",
  },
  assistantBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  userText: {
    fontSize: 14,
    color: "#020617",
  },
  assistantText: {
    fontSize: 14,
    color: "#e5e7eb",
  },
  emptyStateContainer: {
    paddingVertical: 40,
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
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#7f1d1d",
  },
  errorText: {
    color: "#fee2e2",
    fontSize: 12,
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#111827",
    backgroundColor: "#020617",
  },
  input: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e293b",
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: "#e5e7eb",
    fontSize: 14,
    marginRight: 8,
  },
  sendButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#0ea5e9",
  },
  sendButtonDisabled: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1e293b",
  },
  sendButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#020617",
  },
});
