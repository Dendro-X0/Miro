import type { AiModelFilterTag } from "../_settings-store";

export type MainView = "today" | "projects" | "activity" | "settings";

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
  readonly ready?: boolean;
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
}

export interface PlaceholderViewProps {
  readonly title: string;
  readonly description: string;
}
