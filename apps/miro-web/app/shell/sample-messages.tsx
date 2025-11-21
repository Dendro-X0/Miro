import type { ReactElement } from "react";
import ChatHero from "../modules/ui/components/chat/chat-hero";

interface SampleMessagesProps {
  readonly onExampleClick?: (prompt: string) => void;
}

const examples: readonly string[] = [
  "Summarize what has been happening in my workspace recently.",
  "Help me plan a brainstorming workshop on a new board.",
  "Find action items from the last board I updated.",
];

export default function SampleMessages(props: SampleMessagesProps): ReactElement {
  const { onExampleClick } = props;
  return <ChatHero examples={examples} onExampleClick={onExampleClick} />;
}
