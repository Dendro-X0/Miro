import type { ReactElement } from "react";
import ChatHero from "../modules/ui/components/chat/chat-hero";
import type { AssistantMode } from "./types";

interface SampleMessagesProps {
  readonly onExampleClick?: (prompt: string) => void;
  readonly onSelectComposeMode?: (mode: Extract<AssistantMode, "text" | "image">) => void;
}

const examples: readonly string[] = [
  "Summarize what you worked on today.",
  "Help draft a project brief or roadmap.",
  "Brainstorm ideas for your next workshop.",
];

export default function SampleMessages(props: SampleMessagesProps): ReactElement {
  const { onExampleClick, onSelectComposeMode } = props;
  return (
    <ChatHero
      examples={examples}
      onExampleClick={onExampleClick}
      onSelectComposeMode={onSelectComposeMode}
    />
  );
}
