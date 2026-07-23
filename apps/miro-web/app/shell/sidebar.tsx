"use client";

import type { ChangeEvent, ReactElement } from "react";
import { useState } from "react";
import {
  Clock3,
  ImageIcon,
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

type PrimaryModeId = Exclude<MainView, "settings">;

interface SidebarModeItem {
  readonly id: PrimaryModeId;
  readonly label: string;
  readonly icon: ReactElement;
}

const maxSidebarChats: number = 10;

const primaryModes: readonly SidebarModeItem[] = [
  {
    id: "today",
    label: "Chat",
    icon: <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: "gallery",
    label: "Gallery",
    icon: <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: "activity",
    label: "Activity",
    icon: <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />,
  },
];

function modeButtonClasses(active: boolean): string {
  const base =
    "flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition-colors cursor-pointer";
  if (active) {
    return `${base} border-foreground/35 bg-sky-500/10 text-foreground dark:border-white/70`;
  }
  return `${base} border-transparent text-muted-foreground hover:bg-surface-panel`;
}

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
    galleryCount = 0,
    historyHint = "History off",
    providerReady,
  } = props;
  const [chatSearchQuery, setChatSearchQuery] = useState<string>("");
  const [openChatMenuId, setOpenChatMenuId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>("");
  const [renameOpenChatId, setRenameOpenChatId] = useState<string | null>(null);
  const [showAllChats, setShowAllChats] = useState<boolean>(false);
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
  const visibleChats: readonly SidebarChatSummary[] = showAllChats
    ? filteredChats
    : filteredChats.slice(0, maxSidebarChats);
  const hasMoreChats: boolean = filteredChats.length > maxSidebarChats;
  const settingsActive: boolean = view === "settings";

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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-sky-400 to-violet-500 text-slate-950">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-col">
          <UiKickerLabel text="Workspace" tone="muted" />
          <span className="truncate text-sm font-semibold text-foreground">{workspaceName}</span>
        </div>
      </div>

      <nav aria-label="Workspace modes" className="shrink-0 text-xs">
        <ul className="space-y-1">
          {primaryModes.map((item: SidebarModeItem) => {
            const active: boolean = item.id === view;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={(): void => onChangeView(item.id)}
                  className={modeButtonClasses(active)}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-[11px] text-muted-foreground">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        {view === "today" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-2">
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
            <div className="mt-2.5 shrink-0 rounded-2xl surface-panel px-2 py-1.5 text-[11px] text-muted-foreground">
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
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1 scroll-area chat-scroll-touch">
              <ul className="space-y-1">
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
                    {trimmedQuery ? "No chats match your search." : "No chats yet. Start a new one."}
                  </li>
                )}
              </ul>
            </div>
            {hasMoreChats && (
              <button
                type="button"
                onClick={(): void =>
                  setShowAllChats((previous: boolean): boolean => !previous)
                }
                className="mt-1 w-full shrink-0 rounded-2xl px-3 py-1 text-center text-[11px] text-sky-300 hover:bg-surface-panel"
              >
                {showAllChats
                  ? "Show fewer chats"
                  : `Show more chats (${filteredChats.length - maxSidebarChats} more)`}
              </button>
            )}
          </div>
        ) : null}

        {view === "gallery" ? (
          <div className="rounded-2xl surface-panel p-3 text-xs text-muted-foreground">
            <UiKickerLabel text="Library" tone="muted" />
            <p className="mt-2 text-sm text-foreground">
              {galleryCount === 0
                ? "No images yet"
                : `${galleryCount} image${galleryCount === 1 ? "" : "s"}`}
            </p>
            <p className="mt-1 leading-relaxed">
              {galleryCount === 0
                ? "Generate images from Chat (assistant mode → Image). They appear here."
                : "Open Gallery in the main pane to browse or delete assets."}
            </p>
            {galleryCount === 0 ? (
              <button
                type="button"
                onClick={(): void => onChangeView("today")}
                className="mt-3 inline-flex items-center gap-1 rounded-full bg-sky-500/90 px-2.5 py-1 text-[11px] font-medium text-slate-950 hover:bg-sky-400"
              >
                <MessageCircle className="h-3 w-3" aria-hidden="true" />
                <span>Go to Chat</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {view === "activity" ? (
          <div className="rounded-2xl surface-panel p-3 text-xs text-muted-foreground">
            <UiKickerLabel text="Recent" tone="muted" />
            <p className="mt-2 text-sm text-foreground">Local activity feed</p>
            <p className="mt-1 leading-relaxed">
              Recent chats and images appear in the main pane.
            </p>
          </div>
        ) : null}

        {view === "settings" ? (
          <div className="rounded-2xl surface-panel p-3 text-xs text-muted-foreground">
            <UiKickerLabel text="Preferences" tone="muted" />
            <p className="mt-2 text-sm text-foreground">Workspace settings</p>
            <p className="mt-1 leading-relaxed">
              AI keys, appearance, agent memory, and data live in the main pane.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 shrink-0 border-t border-surface pt-3">
        <button
          type="button"
          onClick={(): void => onChangeView("settings")}
          className={
            settingsActive
              ? "flex w-full items-center gap-2 rounded-2xl border border-foreground/25 bg-sky-500/10 px-3 py-2 text-sm text-foreground dark:border-white/50"
              : "flex w-full items-center gap-2 rounded-2xl border border-transparent px-3 py-2 text-sm text-muted-foreground hover:bg-surface-panel"
          }
          aria-current={settingsActive ? "page" : undefined}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-[11px] text-muted-foreground">
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span>Settings</span>
        </button>
        <div className="mt-2 flex flex-col gap-0.5 px-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{historyHint}</p>
          {providerReady !== undefined ? (
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {providerReady ? "AI provider ready" : "AI provider not connected"}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
