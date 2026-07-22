import type { ReactElement } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import {
  deserializeMessageContent,
  getImageUrlFromMessageContent,
  type ChatMessage,
} from "@miro/core";
import { AssistantMarkdown } from "./AssistantMarkdown";

interface ChatBubbleProps {
  readonly message: ChatMessage;
  readonly streaming?: boolean;
}

export function ChatBubble(props: ChatBubbleProps): ReactElement {
  const { message, streaming = false } = props;
  const isUser = message.role === "user";
  const generatedUrl = !isUser ? getImageUrlFromMessageContent(message.content) : null;
  const parts = isUser ? deserializeMessageContent(message.content) : null;
  const showSpinner = streaming && !isUser && message.content.trim().length === 0 && !generatedUrl;

  return (
    <View style={isUser ? styles.userRow : styles.assistantRow}>
      <View style={isUser ? styles.userBubble : styles.assistantBubble}>
        {showSpinner ? (
          <ActivityIndicator color="#94a3b8" size="small" />
        ) : generatedUrl ? (
          <View style={styles.generatedWrap}>
            <Image source={{ uri: generatedUrl }} style={styles.generatedImage} resizeMode="cover" />
            <Text style={styles.caption}>Generated image</Text>
          </View>
        ) : isUser && parts ? (
          <View style={styles.partsColumn}>
            {parts.map((part, index) => {
              if (part.type === "image") {
                return (
                  <Image
                    key={`img-${index}`}
                    source={{ uri: part.image }}
                    style={styles.attachImage}
                    resizeMode="cover"
                  />
                );
              }
              return (
                <Text key={`txt-${index}`} style={styles.userText}>
                  {part.text}
                </Text>
              );
            })}
          </View>
        ) : isUser ? (
          <Text style={styles.userText}>{message.content}</Text>
        ) : (
          <AssistantMarkdown content={message.content || (streaming ? "…" : "")} />
        )}
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
    minHeight: 36,
    justifyContent: "center",
  },
  userText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#020617",
  },
  partsColumn: {
    gap: 8,
  },
  attachImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: "#0f172a",
  },
  generatedWrap: {
    gap: 6,
  },
  generatedImage: {
    width: 240,
    height: 240,
    borderRadius: 12,
    backgroundColor: "#0f172a",
  },
  caption: {
    fontSize: 11,
    color: "#94a3b8",
  },
});
