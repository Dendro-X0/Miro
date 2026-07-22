import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";

type Segment =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "code"; readonly value: string; readonly lang: string };

function splitFences(content: string): readonly Segment[] {
  const segments: Segment[] = [];
  const fence = /```([^\n`]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(content)) !== null) {
    if (match.index > last) {
      segments.push({ kind: "text", value: content.slice(last, match.index) });
    }
    segments.push({
      kind: "code",
      lang: match[1].trim(),
      value: match[2].replace(/\n$/, ""),
    });
    last = match.index + match[0].length;
  }
  if (last < content.length) {
    segments.push({ kind: "text", value: content.slice(last) });
  }
  return segments.length > 0 ? segments : [{ kind: "text", value: content }];
}

function renderInline(text: string, keyPrefix: string): ReactElement[] {
  const nodes: ReactElement[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(
        <Text key={`${keyPrefix}-t${i++}`}>{text.slice(last, match.index)}</Text>,
      );
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <Text key={`${keyPrefix}-b${i++}`} style={styles.bold}>
          {token.slice(2, -2)}
        </Text>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <Text key={`${keyPrefix}-c${i++}`} style={styles.inlineCode}>
          {token.slice(1, -1)}
        </Text>,
      );
    } else {
      nodes.push(
        <Text key={`${keyPrefix}-i${i++}`} style={styles.italic}>
          {token.slice(1, -1)}
        </Text>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    nodes.push(<Text key={`${keyPrefix}-t${i++}`}>{text.slice(last)}</Text>);
  }
  return nodes;
}

function renderTextBlock(value: string, key: string): ReactElement {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  return (
    <View key={key} style={styles.block}>
      {lines.map((line, index) => {
        const heading = /^(#{1,3})\s+(.+)$/.exec(line);
        if (heading) {
          const level = heading[1].length;
          return (
            <Text
              key={`${key}-h${index}`}
              style={[
                styles.body,
                level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3,
              ]}
              selectable
            >
              {renderInline(heading[2], `${key}-h${index}`)}
            </Text>
          );
        }
        const bullet = /^[-*]\s+(.+)$/.exec(line);
        if (bullet) {
          return (
            <View key={`${key}-li${index}`} style={styles.listRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={[styles.body, styles.listText]} selectable>
                {renderInline(bullet[1], `${key}-li${index}`)}
              </Text>
            </View>
          );
        }
        const numbered = /^(\d+)\.\s+(.+)$/.exec(line);
        if (numbered) {
          return (
            <View key={`${key}-ol${index}`} style={styles.listRow}>
              <Text style={styles.bullet}>{numbered[1]}.</Text>
              <Text style={[styles.body, styles.listText]} selectable>
                {renderInline(numbered[2], `${key}-ol${index}`)}
              </Text>
            </View>
          );
        }
        if (!line.trim()) {
          return <View key={`${key}-sp${index}`} style={styles.spacer} />;
        }
        return (
          <Text key={`${key}-p${index}`} style={styles.body} selectable>
            {renderInline(line, `${key}-p${index}`)}
          </Text>
        );
      })}
    </View>
  );
}

interface AssistantMarkdownProps {
  readonly content: string;
}

/** Lightweight assistant text: fences, headings, lists, bold/italic, inline code. */
export function AssistantMarkdown(props: AssistantMarkdownProps): ReactElement {
  const segments = splitFences(props.content);

  return (
    <View>
      {segments.map((segment, index) => {
        if (segment.kind === "code") {
          return (
            <View key={`code-${index}`} style={styles.codeBlock}>
              {segment.lang ? (
                <Text style={styles.codeLang}>{segment.lang}</Text>
              ) : null}
              <Text style={styles.codeText} selectable>
                {segment.value}
              </Text>
            </View>
          );
        }
        const trimmed = segment.value.trim();
        if (!trimmed) {
          return null;
        }
        return renderTextBlock(segment.value, `text-${index}`);
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: "#e5e7eb",
  },
  h1: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 2,
    color: "#f8fafc",
  },
  h2: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 2,
    color: "#f8fafc",
  },
  h3: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
    color: "#f1f5f9",
  },
  bold: {
    fontWeight: "700",
    color: "#f8fafc",
  },
  italic: {
    fontStyle: "italic",
    color: "#e2e8f0",
  },
  inlineCode: {
    fontFamily: "monospace",
    fontSize: 13,
    color: "#7dd3fc",
    backgroundColor: "#0f172a",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingLeft: 2,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    color: "#94a3b8",
    minWidth: 16,
  },
  listText: {
    flex: 1,
  },
  spacer: {
    height: 8,
  },
  codeBlock: {
    marginVertical: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  codeLang: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
    textTransform: "lowercase",
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
    color: "#e2e8f0",
  },
});
