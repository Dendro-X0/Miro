"use client";

import type { ReactElement } from "react";
import type { ChatInputBarProps } from "./types";
import ChatInputBarInner from "../modules/ui/components/chat/chat-input-bar";

export default function ChatInputBar(props: ChatInputBarProps): ReactElement {
  return <ChatInputBarInner {...props} />;
}
