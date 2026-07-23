import type { AiModelFilterTag } from "@miro/core";

export type MainView = "today" | "gallery" | "activity" | "settings";

export type AssistantMode = "auto" | "text" | "image" | "both";

export interface ChatImageAttachmentInput {
  readonly dataUrl: string;
  readonly prompt: string;
}

export interface ChatInputBarProps {
  readonly onSend: (content: string) => Promise<void> | void;
  readonly onGenerateImage?: (prompt: string) => Promise<void> | void;
  readonly onAttachImage?: (input: ChatImageAttachmentInput) => Promise<void> | void;
  readonly sending: boolean;
  readonly onFocus?: () => void;
  readonly placeholder?: string;
  /** Provider used for Whisper transcription (OpenAI-compatible). */
  readonly voiceProviderId?: string;
  readonly voiceByokKey?: string;
  readonly voiceBaseUrl?: string;
  /** When `composeSeedKey` changes, apply `composeSeed` into the composer. */
  readonly composeSeed?: string;
  readonly composeSeedKey?: number;
}

export interface SidebarChatSummary {
  readonly id: string;
  readonly title: string;
  readonly pinned: boolean;
}

export interface ModelSwitcherOption {
  readonly id: string;
  readonly label: string;
  readonly providerId: string;
  readonly providerLabel: string;
  readonly tags: readonly AiModelFilterTag[];
}

export interface ModelSwitcherProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly imageModelId?: string;
  readonly onChangeImageModel?: (value: string) => void;
  readonly options: readonly ModelSwitcherOption[];
  readonly selectedProviderId?: string;
  readonly ready?: boolean;
  readonly loading?: boolean;
}

export interface SidebarContentProps {
  readonly workspaceName: string;
  readonly view: MainView;
  readonly onChangeView: (view: MainView) => void;
  readonly chats: readonly SidebarChatSummary[];
  readonly activeChatId: string;
  readonly onSelectChat: (chatId: string) => void;
  readonly onNewChat: () => void;
  readonly onTogglePinChat: (chatId: string) => void;
  readonly onRenameChat: (chatId: string, title: string) => void;
  readonly onDeleteChat: (chatId: string) => void;
  /** Gallery asset count for contextual middle when Gallery is selected. */
  readonly galleryCount?: number;
  /** History persistence status shown in the footer strip. */
  readonly historyHint?: string;
  /** When true, footer can show that the AI provider is ready. */
  readonly providerReady?: boolean;
}

export interface PlaceholderViewProps {
  readonly title: string;
  readonly description: string;
}
