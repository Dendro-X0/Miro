import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ChatMessage } from "@miro/core";

interface ChatBubbleProps {
  readonly message: ChatMessage;
}

export function ChatBubble(props: ChatBubbleProps): ReactElement {
  const { message } = props;
  const isUser = message.role === "user";

  return (
    <View style={isUser ? styles.userRow : styles.assistantRow}>
      <View style={isUser ? styles.userBubble : styles.assistantBubble}>
        <Text style={isUser ? styles.userText : styles.assistantText}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  assistantRow: {
    alignItems: "flex-start",
    marginBottom: 8,
  },
  userBubble: {
    maxWidth: "85%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0ea5e9",
  },
  assistantBubble: {
    maxWidth: "85%",
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
});
