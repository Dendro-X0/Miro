"use client";

import type { ChangeEvent, ReactElement } from "react";
import { useState } from "react";
import {
  Clock3,
  FolderKanban,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { MainView, SidebarChatSummary, SidebarContentProps } from "./types";
import UiKickerLabel from "../ui/kicker-label";
import UiBadge from "../ui/badge";

interface SidebarItem {
  readonly id: MainView;
  readonly label: string;
  readonly icon: ReactElement;
}

const maxSidebarChats: number = 10;

const items: readonly SidebarItem[] = [
  {
    id: "today",
    label: "Chat",
    icon: <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: "projects",
    label: "Projects",
    icon: <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: "activity",
    label: "Activity",
    icon: <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />,
  },
];

export default function SidebarContent(props: SidebarContentProps): ReactElement {
  const {
    workspaceName,
    view,
    onChangeView,
    chats,
    activeChatId,
    onSelectChat,
    onNewChat,
    onTogglePinChat,
    onRenameChat,
    onDeleteChat,
  } = props;
  const [chatSearchQuery, setChatSearchQuery] = useState<string>("");
  const [openChatMenuId, setOpenChatMenuId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>("");
  const [renameOpenChatId, setRenameOpenChatId] = useState<string | null>(null);
  const trimmedQuery: string = chatSearchQuery.trim().toLowerCase();
  const filteredChats: readonly SidebarChatSummary[] = chats.filter(
    (chat: SidebarChatSummary): boolean => {
      if (!trimmedQuery) {
        return true;
      }
      const normalizedTitle: string = chat.title.toLowerCase();
      return normalizedTitle.includes(trimmedQuery);
    },
  );
  const visibleChats: readonly SidebarChatSummary[] = filteredChats.slice(0, maxSidebarChats);

  function handleChangeChatSearch(event: ChangeEvent<HTMLInputElement>): void {
    setChatSearchQuery(event.target.value);
  }

  function handleChangeRenameDraft(event: ChangeEvent<HTMLInputElement>): void {
    setRenameDraft(event.target.value);
  }

  function handleSubmitRename(chatId: string): void {
    onRenameChat(chatId, renameDraft);
    setOpenChatMenuId(null);
    setRenameOpenChatId(null);
  }

  function handleDeleteChat(chatId: string): void {
    setOpenChatMenuId(null);
    setRenameOpenChatId(null);
    onDeleteChat(chatId);
  }

  function handleTogglePin(chatId: string): void {
    onTogglePinChat(chatId);
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-linear-to-br from-sky-400 to-violet-500 text-slate-950">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground">Workspace</span>
          <span className="text-sm font-semibold text-foreground">{workspaceName}</span>
        </div>
      </div>
      <nav aria-label="Workspace sections" className="mb-4 text-xs">
        <ul className="space-y-1">
          {items.map((item: SidebarItem) => {
            const active: boolean = item.id === view;
            const isChatItem: boolean = item.id === "today";
            const baseClasses: string =
              "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition-colors cursor-pointer";
            const activeClasses: string = `${baseClasses} bg-sky-500/15 text-foreground`;
            const inactiveClasses: string = `${baseClasses} text-muted-foreground hover:bg-surface-panel`;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={(): void => onChangeView(item.id)}
                  className={active ? activeClasses : inactiveClasses}
                  aria-current={active ? "page" : undefined}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-[11px] text-muted-foreground">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {active && (
                    <UiBadge tone="primary">Active</UiBadge>
                  )}
                </button>
                {isChatItem && active && chats.length > 0 && (
                  <div className="mt-2 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <UiKickerLabel text="Recent chats" tone="muted" />
                      <button
                        type="button"
                        onClick={onNewChat}
                        className="inline-flex items-center gap-1 rounded-full bg-sky-500/90 px-2 py-0.5 text-[11px] font-medium text-slate-950 shadow-sm hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel-muted"
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                        <span>New</span>
                      </button>
                    </div>
                    <div className="mt-2.5 rounded-2xl surface-panel px-2 py-1.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Search className="h-3 w-3" aria-hidden="true" />
                        <input
                          type="search"
                          value={chatSearchQuery}
                          onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                            handleChangeChatSearch(event)
                          }
                          placeholder="Search chats..."
                          className="h-5 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                      </div>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {visibleChats.map((chat: SidebarChatSummary) => {
                        const chatActive: boolean = chat.id === activeChatId;
                        const chatBaseClasses: string =
                          "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition-colors";
                        const chatActiveClasses: string = `${chatBaseClasses} bg-sky-500/15 text-foreground`;
                        const chatInactiveClasses: string = `${chatBaseClasses} text-muted-foreground hover:bg-surface-panel`;
                        const isMenuOpen: boolean = openChatMenuId === chat.id;
                        const isRenameOpen: boolean = renameOpenChatId === chat.id;
                        return (
                          <li key={chat.id}>
                            <div className={chatActive ? chatActiveClasses : chatInactiveClasses}>
                              <button
                                type="button"
                                onClick={(): void => onSelectChat(chat.id)}
                                className="flex min-w-0 flex-1 items-center text-left"
                                aria-label={`Open chat: ${chat.title}`}
                              >
                                <span className="flex min-w-0 items-center gap-1">
                                  {chat.pinned && (
                                    <span
                                      className="inline-flex h-3 w-3 items-center justify-center text-[10px] text-sky-300"
                                      aria-hidden="true"
                                      title="Pinned"
                                    >
                                      <Pin className="h-3 w-3" />
                                    </span>
                                  )}
                                  <span className="truncate">{chat.title}</span>
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={(): void => {
                                  if (isMenuOpen) {
                                    setOpenChatMenuId(null);
                                    return;
                                  }
                                  setOpenChatMenuId(chat.id);
                                }}
                                className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted/80 text-muted-foreground hover:bg-surface"
                                aria-label={`More options for ${chat.title}`}
                                aria-expanded={isMenuOpen}
                              >
                                <MoreHorizontal className="h-3 w-3" aria-hidden="true" />
                              </button>
                            </div>
                            {isMenuOpen && (
                              <div className="mt-1 rounded-2xl border border-surface bg-surface-panel px-2 py-1.5 text-[11px] text-muted-foreground shadow-lg">
                                <button
                                  type="button"
                                  onClick={(): void => handleTogglePin(chat.id)}
                                  className={
                                    chat.pinned
                                      ? "flex w-full items-center justify-between rounded-xl px-2 py-1 text-[11px] text-sky-200 bg-surface hover:bg-surface-muted"
                                      : "flex w-full items-center justify-between rounded-xl px-2 py-1 text-[11px] font-medium text-slate-950 bg-sky-500/90 hover:bg-sky-400"
                                  }
                                >
                                  <span className="flex items-center gap-1">
                                    <Pin className="h-3 w-3" aria-hidden="true" />
                                    <span>{chat.pinned ? "Unpin chat" : "Pin chat"}</span>
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(): void => {
                                    if (isRenameOpen) {
                                      setRenameOpenChatId(null);
                                      return;
                                    }
                                    setRenameDraft(chat.title);
                                    setRenameOpenChatId(chat.id);
                                  }}
                                  className="mt-1 flex w-full items-center justify-between rounded-xl px-2 py-1 text-[11px] hover:bg-surface"
                                >
                                  <span>Rename chat</span>
                                </button>
                                {isRenameOpen && (
                                  <div className="mt-1 rounded-xl bg-surface px-2 py-1">
                                    <input
                                      type="text"
                                      value={renameDraft}
                                      onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                                        handleChangeRenameDraft(event)
                                      }
                                      placeholder="Leave blank for automatic title"
                                      className="w-full rounded-lg border border-surface bg-surface-muted px-2 py-1 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                                    />
                                    <div className="mt-1 flex justify-end">
                                      <button
                                        type="button"
                                        onClick={(): void => handleSubmitRename(chat.id)}
                                        className="rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-medium text-slate-950 hover:bg-sky-400"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={(): void => handleDeleteChat(chat.id)}
                                  className="mt-1 flex w-full items-center justify-between rounded-xl px-2 py-1 text-[11px] font-medium text-slate-950 bg-red-500/85 hover:bg-red-400"
                                >
                                  <span>Delete chat</span>
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                      {visibleChats.length === 0 && (
                        <li className="rounded-2xl px-2 py-1 text-[11px] text-muted-foreground">
                          No chats match your search.
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <section className="mt-auto flex flex-1 flex-col justify-end text-xs text-muted-foreground">
        <div className="rounded-2xl surface-panel p-3">
          <p className="mb-1 font-medium text-foreground">Try asking Miro to</p>
          <ul className="space-y-1">
            <li>Summarize what you worked on today.</li>
            <li>Help draft a project brief or roadmap.</li>
            <li>Brainstorm ideas for your next workshop.</li>
          </ul>
        </div>
        <div className="mt-4 rounded-2xl surface-panel p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Quick tip</p>
          <p>Hold Shift + Enter for multi-line prompts. Press Enter to send.</p>
        </div>
      </section>
    </>
  );
}
