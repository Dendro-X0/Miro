"use client";

import type { MutableRefObject, ReactElement, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Globe2,
  Image as ImageIcon,
  Layers,
  Menu,
  MessageCircle,
  MessageSquareText,
  Settings,
  Sparkles,
} from "lucide-react";
import ThemeToggle from "./_theme-toggle";
import SettingsView from "./settings/settings-view";
import { useSettings } from "./_settings-store";
import type { AiCustomModel, AiModelFilterTag } from "./_settings-store";
import type {
  AssistantMode,
  ChatImageAttachmentInput,
  MainView,
  ModelSwitcherOption,
  SidebarChatSummary,
} from "./shell/types";
import SidebarContent from "./shell/sidebar";
import ModelSwitcher from "./shell/model-switcher";
import ChatInputBar from "./shell/chat-input";
import PlaceholderView from "./shell/placeholder-view";
import SampleMessages from "./shell/sample-messages";
import UiKickerLabel from "./ui/kicker-label";
import PillButton from "./ui/pill-button";
import AssistantModeRow from "./modules/ui/components/chat/assistant-mode-row";
import ChatErrorBanner from "./modules/ui/components/chat/chat-error-banner";
import aiModelConfig from "./settings/ai-model-presets";

interface AppShellProps {
  readonly children?: ReactNode;
}

interface UiChatMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
}

interface BackendChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
  readonly imageDataUrl?: string;
}

interface BackendChatCompletionChoice {
  readonly index?: number;
  readonly message: BackendChatMessage;
}

interface BackendChatCompletion {
  readonly choices: readonly BackendChatCompletionChoice[];
}

interface AiChatResponseBody {
  readonly completion: BackendChatCompletion;
}

interface AiAssistantResponseBody {
  readonly completion?: BackendChatCompletion;
  readonly images?: readonly BackendImageResult[];
}

interface BackendImageResult {
  readonly url: string;
}

interface AiImageResponseBody {
  readonly images: readonly BackendImageResult[];
}

interface AiConfigReadyResponse {
  readonly ready: boolean;
}

interface ChatSession {
  readonly id: string;
  readonly messages: readonly UiChatMessage[];
  readonly pinned: boolean;
  readonly titleOverride?: string;
}

interface ChatState {
  readonly sessions: readonly ChatSession[];
  readonly activeId: string;
}

const maxChatSessions: number = 10;

const defaultModelId: string = "gemini-2.5-flash";
const defaultApiBaseUrl: string = process.env.NEXT_PUBLIC_MIRO_API_BASE_URL ?? "http://localhost:8787";
const systemPrompt: string = "You are the Miro workspace assistant.";

/** High-level application shell with sidebar, chat area, and theming. */
export default function AppShell(props: AppShellProps): ReactElement {
  const { children } = props;
  const [chatState, setChatState] = useState<ChatState>(() => createInitialChatState());
  const [sending, setSending] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<MainView>("today");
  const [assistantMode, setAssistantMode] = useState<AssistantMode>("auto");
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const { settings, updateSettings, resetSettings } = useSettings();
  const modelId: string = settings.aiView.selectedModelId || defaultModelId;
  const byokKey: string = settings.aiView.byokKey;
  const imageModelId: string = settings.aiView.selectedImageModelId;
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const headerModelOptions: readonly ModelSwitcherOption[] = buildHeaderModelOptions({
    showModelIds: settings.aiView.showModelIds,
    showProviderDetails: settings.aiView.showProviderDetails,
    customModels: settings.aiView.customModels,
  });
  const scrollContainerRef: MutableRefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null);
  const activeSession: ChatSession | undefined = findActiveChatSession(chatState.sessions, chatState.activeId);
  const messages: readonly UiChatMessage[] = activeSession?.messages ?? [];
  const sortedSessions: ChatSession[] = [...chatState.sessions].sort(
    (first: ChatSession, second: ChatSession): number => {
      if (first.pinned !== second.pinned) {
        return first.pinned ? -1 : 1;
      }

      const firstActivity: number = getChatLastActivityTimestamp(first);
      const secondActivity: number = getChatLastActivityTimestamp(second);
      if (firstActivity === secondActivity) {
        return 0;
      }
      return secondActivity - firstActivity;
    },
  );
  const sidebarChats: readonly SidebarChatSummary[] = sortedSessions.map(
    (session: ChatSession): SidebarChatSummary => ({
      id: session.id,
      title: getSessionTitle(session),
      pinned: session.pinned,
    }),
  );

  function handleChangeView(nextView: MainView): void {
    setView(nextView);
    setMobileSidebarOpen(false);
  }

  function handleOpenMobileSidebar(): void {
    setMobileSidebarOpen(true);
  }

  function handleCloseMobileSidebar(): void {
    setMobileSidebarOpen(false);
  }

  function handleToggleSettingsView(): void {
    const nextView: MainView = view === "settings" ? "today" : "settings";
    handleChangeView(nextView);
  }

  function handleChangeModel(nextModelId: string): void {
    updateSettings({ aiView: { selectedModelId: nextModelId } });
  }

  function handleChangeImageModel(nextModelId: string): void {
    updateSettings({ aiView: { selectedImageModelId: nextModelId } });
  }

  function handleChangeAssistantMode(nextMode: AssistantMode): void {
    setAssistantMode(nextMode);
  }

  function handleToggleWebSearch(): void {
    setWebSearchEnabled((previous: boolean): boolean => !previous);
  }

  function handleSelectChatSession(chatId: string): void {
    if (chatId === chatState.activeId) {
      return;
    }
    setChatState((previous: ChatState): ChatState => {
      const exists: boolean = previous.sessions.some((session: ChatSession): boolean => session.id === chatId);
      if (!exists) {
        return previous;
      }
      return {
        sessions: previous.sessions,
        activeId: chatId,
      };
    });
    setError(null);
    setSending(false);
  }

  function handleTogglePinChatSession(chatId: string): void {
    setChatState((previous: ChatState): ChatState => {
      const nextSessions: ChatSession[] = previous.sessions.map((session: ChatSession): ChatSession => {
        if (session.id !== chatId) {
          return session;
        }
        const pinned: boolean = !session.pinned;
        const nextSession: ChatSession = {
          ...session,
          pinned,
        };
        return nextSession;
      });
      const nextState: ChatState = {
        sessions: nextSessions,
        activeId: previous.activeId,
      };
      return nextState;
    });
  }

  function handleRenameChatSession(chatId: string, nextTitle: string): void {
    const trimmed: string = nextTitle.trim();
    setChatState((previous: ChatState): ChatState => {
      const nextSessions: ChatSession[] = previous.sessions.map((session: ChatSession): ChatSession => {
        if (session.id !== chatId) {
          return session;
        }
        const titleOverride: string | undefined = trimmed ? trimmed : undefined;
        const nextSession: ChatSession = {
          ...session,
          titleOverride,
        };
        return nextSession;
      });
      const nextState: ChatState = {
        sessions: nextSessions,
        activeId: previous.activeId,
      };
      return nextState;
    });
  }

  function handleDeleteChatSession(chatId: string): void {
    setChatState((previous: ChatState): ChatState => {
      const remaining: ChatSession[] = previous.sessions.filter((session: ChatSession): boolean => session.id !== chatId);
      if (remaining.length === 0) {
        const state: ChatState = createInitialChatState();
        return state;
      }
      const nextActiveId: string = previous.activeId === chatId ? remaining[0].id : previous.activeId;
      const nextState: ChatState = {
        sessions: remaining,
        activeId: nextActiveId,
      };
      return nextState;
    });
    setError(null);
    setSending(false);
  }

  function handleNewChatSession(): void {
    setChatState((previous: ChatState): ChatState => {
      const nextId: string = createChatSessionId();
      const nextSession: ChatSession = {
        id: nextId,
        messages: [],
        pinned: false,
      };
      const merged: ChatSession[] = [nextSession, ...previous.sessions];
      const limited: ChatSession[] = merged.slice(0, maxChatSessions);
      return {
        sessions: limited,
        activeId: nextId,
      };
    });
    setError(null);
    setSending(false);
  }

  async function handleSendMessage(content: string): Promise<void> {
    if (sending) {
      return;
    }
    const trimmed: string = content.trim();
    if (!trimmed) {
      return;
    }
    const userMessage: UiChatMessage = {
      id: `user-${Date.now().toString(10)}`,
      role: "user",
      content: trimmed,
    };
    const baseMessages: readonly UiChatMessage[] = messages;
    const nextMessages: readonly UiChatMessage[] = [...baseMessages, userMessage];
    setChatState((previous: ChatState): ChatState => updateActiveSessionMessages(previous, nextMessages));
    setError(null);
    setSending(true);
    try {
      const backendMessages: readonly BackendChatMessage[] = buildBackendMessages(nextMessages);
      const response: Response = await fetch(`${defaultApiBaseUrl}/v2/ai/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: backendMessages,
          mode: assistantMode,
          textModel: modelId,
          imageModel: imageModelId,
          webSearchEnabled,
          byokKey,
        }),
      });
      if (!response.ok) {
        setError("Unable to reach Miro right now. Please try again in a moment.");
        return;
      }
      const body: AiAssistantResponseBody = (await response.json()) as AiAssistantResponseBody;
      const assistantMessages: UiChatMessage[] = [];
      if (body.completion) {
        const firstChoice: BackendChatCompletionChoice | undefined = body.completion.choices[0];
        const assistantContent: string | undefined = firstChoice?.message.content;
        if (assistantContent) {
          const assistantTextMessage: UiChatMessage = {
            id: `assistant-${Date.now().toString(10)}`,
            role: "assistant",
            content: assistantContent,
          };
          assistantMessages.push(assistantTextMessage);
        }
      }
      if (body.images && body.images.length > 0) {
        const firstImage: BackendImageResult | undefined = body.images[0];
        const imageUrl: string | undefined = firstImage?.url;
        if (imageUrl) {
          const assistantImageMessage: UiChatMessage = {
            id: `assistant-image-${Date.now().toString(10)}`,
            role: "assistant",
            content: `Generated image: ${imageUrl}`,
          };
          assistantMessages.push(assistantImageMessage);
        }
      }
      if (assistantMessages.length === 0) {
        setError("Received an empty response from Miro. Please try again.");
        return;
      }
      const finalMessages: readonly UiChatMessage[] = [...nextMessages, ...assistantMessages];
      setChatState((previous: ChatState): ChatState => updateActiveSessionMessages(previous, finalMessages));
    } catch {
      setError("Something went wrong while talking to Miro. Check your connection and try again.");
      return;
    } finally {
      setSending(false);
    }
  }

  async function handleGenerateImage(prompt: string): Promise<void> {
    if (sending) {
      return;
    }
    const trimmed: string = prompt.trim();
    if (!trimmed) {
      return;
    }
    const userMessage: UiChatMessage = {
      id: `user-${Date.now().toString(10)}`,
      role: "user",
      content: trimmed,
    };
    const nextMessages: readonly UiChatMessage[] = [...messages, userMessage];
    setChatState((previous: ChatState): ChatState => updateActiveSessionMessages(previous, nextMessages));
    setError(null);
    setSending(true);
    try {
      const response: Response = await fetch(`${defaultApiBaseUrl}/v2/ai/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildImageRequestBody({ prompt: trimmed, byokKey, modelId: imageModelId }),
        ),
      });
      if (!response.ok) {
        setError("Unable to reach Miro right now. Please try again in a moment.");
        return;
      }
      const body: AiImageResponseBody = (await response.json()) as AiImageResponseBody;
      const firstImage: BackendImageResult | undefined = body.images[0];
      const imageUrl: string | undefined = firstImage?.url;
      if (!imageUrl) {
        setError("Received an empty image response from Miro. Please try again.");
        return;
      }
      const assistantMessage: UiChatMessage = {
        id: `assistant-${Date.now().toString(10)}`,
        role: "assistant",
        content: `Generated image: ${imageUrl}`,
      };
      const finalMessages: readonly UiChatMessage[] = [...nextMessages, assistantMessage];
      setChatState((previous: ChatState): ChatState => updateActiveSessionMessages(previous, finalMessages));
    } catch {
      setError("Something went wrong while generating an image. Check your connection and try again.");
      return;
    } finally {
      setSending(false);
    }
  }

  async function handleAttachImage(input: ChatImageAttachmentInput): Promise<void> {
    if (sending) {
      return;
    }
    const trimmedDataUrl: string = input.dataUrl.trim();
    if (!trimmedDataUrl) {
      return;
    }
    const trimmedPrompt: string = input.prompt.trim();
    const content: string = trimmedPrompt.length > 0 ? trimmedPrompt : "Please take a look at this image.";
    const userMessage: UiChatMessage = {
      id: `user-image-${Date.now().toString(10)}`,
      role: "user",
      content,
    };
    const baseMessages: readonly UiChatMessage[] = messages;
    const nextMessages: readonly UiChatMessage[] = [...baseMessages, userMessage];
    setChatState((previous: ChatState): ChatState => updateActiveSessionMessages(previous, nextMessages));
    setError(null);
    setSending(true);
    try {
      const backendMessages: readonly BackendChatMessage[] = buildBackendMessages(nextMessages, trimmedDataUrl);
      const response: Response = await fetch(`${defaultApiBaseUrl}/v2/ai/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: backendMessages,
          mode: assistantMode,
          textModel: modelId,
          imageModel: imageModelId,
          webSearchEnabled,
          byokKey,
        }),
      });
      if (!response.ok) {
        setError("Unable to reach Miro right now. Please try again in a moment.");
        return;
      }
      const body: AiAssistantResponseBody = (await response.json()) as AiAssistantResponseBody;
      const assistantMessages: UiChatMessage[] = [];
      if (body.completion) {
        const firstChoice: BackendChatCompletionChoice | undefined = body.completion.choices[0];
        const assistantContent: string | undefined = firstChoice?.message.content;
        if (assistantContent) {
          const assistantTextMessage: UiChatMessage = {
            id: `assistant-${Date.now().toString(10)}`,
            role: "assistant",
            content: assistantContent,
          };
          assistantMessages.push(assistantTextMessage);
        }
      }
      if (body.images && body.images.length > 0) {
        const firstImage: BackendImageResult | undefined = body.images[0];
        const imageUrl: string | undefined = firstImage?.url;
        if (imageUrl) {
          const assistantImageMessage: UiChatMessage = {
            id: `assistant-image-${Date.now().toString(10)}`,
            role: "assistant",
            content: `Generated image: ${imageUrl}`,
          };
          assistantMessages.push(assistantImageMessage);
        }
      }
      if (assistantMessages.length === 0) {
        setError("Received an empty response from Miro. Please try again.");
        return;
      }
      const finalMessages: readonly UiChatMessage[] = [...nextMessages, ...assistantMessages];
      setChatState((previous: ChatState): ChatState => updateActiveSessionMessages(previous, finalMessages));
    } catch {
      setError("Something went wrong while talking to Miro. Check your connection and try again.");
      return;
    } finally {
      setSending(false);
    }
  }

  async function handleRetryLastMessage(): Promise<void> {
    if (sending) {
      return;
    }
    if (messages.length === 0) {
      return;
    }
    const activeMessages: readonly UiChatMessage[] = messages;
    setError(null);
    setSending(true);
    try {
      const backendMessages: readonly BackendChatMessage[] = buildBackendMessages(activeMessages);
      const response: Response = await fetch(`${defaultApiBaseUrl}/v2/ai/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: backendMessages,
          mode: assistantMode,
          textModel: modelId,
          imageModel: imageModelId,
          webSearchEnabled,
          byokKey,
        }),
      });
      if (!response.ok) {
        setError("Unable to reach Miro right now. Please try again in a moment.");
        return;
      }
      const body: AiAssistantResponseBody = (await response.json()) as AiAssistantResponseBody;
      const assistantMessages: UiChatMessage[] = [];
      if (body.completion) {
        const firstChoice: BackendChatCompletionChoice | undefined = body.completion.choices[0];
        const assistantContent: string | undefined = firstChoice?.message.content;
        if (assistantContent) {
          const assistantTextMessage: UiChatMessage = {
            id: `assistant-${Date.now().toString(10)}`,
            role: "assistant",
            content: assistantContent,
          };
          assistantMessages.push(assistantTextMessage);
        }
      }
      if (body.images && body.images.length > 0) {
        const firstImage: BackendImageResult | undefined = body.images[0];
        const imageUrl: string | undefined = firstImage?.url;
        if (imageUrl) {
          const assistantImageMessage: UiChatMessage = {
            id: `assistant-image-${Date.now().toString(10)}`,
            role: "assistant",
            content: `Generated image: ${imageUrl}`,
          };
          assistantMessages.push(assistantImageMessage);
        }
      }
      if (assistantMessages.length === 0) {
        setError("Received an empty response from Miro. Please try again.");
        return;
      }
      const finalMessages: readonly UiChatMessage[] = [...activeMessages, ...assistantMessages];
      setChatState((previous: ChatState): ChatState => updateActiveSessionMessages(previous, finalMessages));
    } catch {
      setError("Something went wrong while talking to Miro. Check your connection and try again.");
      return;
    } finally {
      setSending(false);
    }
  }

  function handleDismissError(): void {
    setError(null);
  }

  function handleFocusChatInput(): void {
    const container: HTMLDivElement | null = scrollContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({ top: container.scrollHeight, behavior: "auto" });
  }

  function handleSelectSamplePrompt(prompt: string): void {
    void handleSendMessage(prompt);
  }

  useEffect((): (() => void) => {
    let active: boolean = true;
    async function loadAiReady(): Promise<void> {
      try {
        const response: Response = await fetch(`${defaultApiBaseUrl}/ai/config`);
        if (!response.ok) {
          if (!active) {
            return;
          }
          setAiReady(null);
          return;
        }
        const body: AiConfigReadyResponse = (await response.json()) as AiConfigReadyResponse;
        if (!active) {
          return;
        }
        setAiReady(body.ready);
      } catch {
        if (!active) {
          return;
        }
        setAiReady(null);
      }
    }
    void loadAiReady();
    return (): void => {
      active = false;
    };
  }, []);

  useEffect((): void => {
    const container: HTMLDivElement | null = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const prefersReduced: boolean =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = prefersReduced ? "auto" : "smooth";
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, [messages, sending]);

  useEffect((): void => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }
    clearDevServiceWorkersAndCaches();
  }, []);

  const hasMessages: boolean = messages.length > 0;
  const topic: string = getCurrentTopic(messages);
  const chatPlaceholder: string = getChatPlaceholder(assistantMode, webSearchEnabled);

  return (
    <div className="miro-gradient-shell min-h-screen text-foreground">
      <div className="flex min-h-screen w-full max-w-full gap-0 px-0 py-0 md:gap-4 md:px-4 md:py-4 lg:px-6 xl:px-10">
        <aside className="hidden w-64 flex-col rounded-none surface-panel-muted p-4 backdrop-blur md:rounded-3xl lg:flex">
          <SidebarContent
            workspaceName={settings.profile.workspaceName}
            view={view}
            onChangeView={handleChangeView}
            chats={sidebarChats}
            activeChatId={chatState.activeId}
            onSelectChat={handleSelectChatSession}
            onNewChat={handleNewChatSession}
            onTogglePinChat={handleTogglePinChatSession}
            onRenameChat={handleRenameChatSession}
            onDeleteChat={handleDeleteChatSession}
          />
        </aside>
        <main className="flex w-full max-w-full flex-1 flex-col rounded-none surface-panel p-2 md:rounded-3xl md:p-4 backdrop-blur">
          <header className="relative z-20 mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenMobileSidebar}
                className="flex h-10 w-10 items-center justify-center rounded-2xl surface-panel-muted text-foreground md:h-9 md:w-9 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel-muted"
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="hidden flex-col md:flex">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">Miro</span>
                <h1 className="text-lg font-semibold text-foreground">
                  {getMainViewTitle(view, topic)}
                </h1>
              </div>
              <div className="flex items-center md:hidden">
                <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-panel-muted/70 text-sky-300">
                  <MessageCircle className="h-3 w-3" aria-hidden="true" />
                </span>
                <UiKickerLabel text="Topic" />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ModelSwitcher
                value={modelId}
                onChange={handleChangeModel}
                imageModelId={imageModelId}
                onChangeImageModel={handleChangeImageModel}
                options={headerModelOptions}
                ready={aiReady === null ? undefined : aiReady}
              />
              <div className="sm:hidden">
                <ThemeToggle compact />
              </div>
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={handleToggleSettingsView}
                aria-label={view === "settings" ? "Close settings" : "Open settings"}
                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-surface bg-surface-muted text-foreground hover:border-sky-400/80 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>
          {view === "today" && (
            <section className="flex min-h-0 flex-1 flex-col gap-3 pb-4" aria-label="Chat">
              <div
                ref={scrollContainerRef}
                className="flex-1 space-y-3 overflow-y-auto pr-1 pt-1 pb-3 chat-scroll-touch"
                role="log"
                aria-live="polite"
                aria-relevant="additions"
              >
                {!hasMessages && (children ?? <SampleMessages onExampleClick={handleSelectSamplePrompt} />)}
                {messages.map((message) => {
                  const isUser: boolean = message.role === "user";
                  const alignment: string = isUser ? "justify-end" : "justify-start";
                  const bubbleClass: string = isUser
                    ? "chat-bubble-enter bg-sky-500/90 text-slate-950 shadow-md"
                    : "chat-bubble-enter surface-bubble-muted text-foreground border border-surface shadow-sm";
                  const imageUrl: string | null = !isUser
                    ? getImageUrlFromMessageContent(message.content)
                    : null;
                  if (imageUrl) {
                    return (
                      <div key={message.id} className={`flex ${alignment}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${bubbleClass}`}>
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-muted-foreground">Generated image</p>
                            <a
                              href={imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="group block overflow-hidden rounded-xl border border-surface bg-surface"
                            >
                              <img
                                src={imageUrl}
                                alt="Generated image"
                                className="h-auto max-h-64 w-full object-contain transition-opacity group-hover:opacity-95"
                              />
                            </a>
                            <div className="flex justify-end gap-2 text-[11px] text-muted-foreground">
                              <a
                                href={imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="underline-offset-2 hover:underline"
                              >
                                Open image
                              </a>
                              <button
                                type="button"
                                onClick={(): void => handleCopyImageUrl(imageUrl)}
                                className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-foreground hover:border-sky-400/60 hover:text-sky-200"
                              >
                                Copy link
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={message.id} className={`flex ${alignment}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${bubbleClass}`}>
                        <p>{message.content}</p>
                      </div>
                    </div>
                  );
                })}
                {sending && !error && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-2xl surface-bubble-muted px-3 py-1.5 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
                      <span>Miro is thinking…</span>
                    </div>
                  </div>
                )}
                {error && (
                  <ChatErrorBanner
                    message={error}
                    onRetry={handleRetryLastMessage}
                    onDismiss={handleDismissError}
                  />
                )}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                <AssistantModeRow
                  mode={assistantMode}
                  onChangeMode={handleChangeAssistantMode}
                  webSearchEnabled={webSearchEnabled}
                  onToggleWebSearch={handleToggleWebSearch}
                />
              </div>
              <ChatInputBar
                onSend={handleSendMessage}
                onGenerateImage={handleGenerateImage}
                onAttachImage={handleAttachImage}
                sending={sending}
                onFocus={handleFocusChatInput}
                placeholder={chatPlaceholder}
              />
            </section>
          )}
          {view === "projects" && (
            <PlaceholderView
              title="Projects"
              description="Projects view is coming soon. For now, ask Miro to help you plan or summarize projects in the chat."
            />
          )}
          {view === "activity" && (
            <PlaceholderView
              title="Activity"
              description="Activity view is coming soon. You can still ask Miro about what has been happening in your workspace."
            />
          )}
          {view === "settings" && (
            <SettingsView settings={settings} onUpdate={updateSettings} onReset={resetSettings} />
          )}
        </main>
      </div>
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseMobileSidebar}
          />
          <div className="relative ml-auto flex h-full w-72 max-w-[80%] flex-col rounded-l-3xl surface-panel-muted p-4 backdrop-blur sidebar-slide-in">
            <SidebarContent
              workspaceName={settings.profile.workspaceName}
              view={view}
              onChangeView={handleChangeView}
              chats={sidebarChats}
              activeChatId={chatState.activeId}
              onSelectChat={handleSelectChatSession}
              onNewChat={handleNewChatSession}
              onTogglePinChat={handleTogglePinChatSession}
              onRenameChat={handleRenameChatSession}
              onDeleteChat={handleDeleteChatSession}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function clearDevServiceWorkersAndCaches(): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return;
  }
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations: readonly ServiceWorkerRegistration[]): void => {
        registrations.forEach((registration: ServiceWorkerRegistration): void => {
          void registration.unregister();
        });
      });
  }
  if ("caches" in window) {
    void caches.keys().then((keys: readonly string[]): void => {
      keys.forEach((key: string): void => {
        void caches.delete(key);
      });
    });
  }
}

interface HeaderModelOptionsParams {
  readonly showModelIds: boolean;
  readonly showProviderDetails: boolean;
  readonly customModels: readonly AiCustomModel[];
}

interface HeaderModelProviderPreset {
  readonly id: string;
  readonly label: string;
}

interface HeaderModelPreset {
  readonly id: string;
  readonly providerId: string;
  readonly label: string;
  readonly tags: readonly AiModelFilterTag[];
}

interface HeaderModelConfigShape {
  readonly providers: readonly HeaderModelProviderPreset[];
  readonly models: readonly HeaderModelPreset[];
}

function buildHeaderModelOptions(params: HeaderModelOptionsParams): readonly ModelSwitcherOption[] {
  const config: HeaderModelConfigShape = aiModelConfig as HeaderModelConfigShape;
  const providerLabelById: Record<string, string> = {};
  for (const provider of config.providers) {
    providerLabelById[provider.id] = provider.label;
  }
  const baseModels: HeaderModelPreset[] = [];
  for (const model of config.models) {
    baseModels.push(model);
  }
  const customModels: HeaderModelPreset[] = [];
  for (const custom of params.customModels) {
    const preset: HeaderModelPreset = {
      id: custom.id,
      providerId: custom.providerId,
      label: custom.label,
      tags: custom.tags,
    };
    customModels.push(preset);
  }
  const allModels: HeaderModelPreset[] = [...baseModels, ...customModels];
  const seen: Set<string> = new Set<string>();
  const options: ModelSwitcherOption[] = [];
  for (const model of allModels) {
    const key: string = `${model.providerId}:${model.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const providerLabel: string = providerLabelById[model.providerId] ?? model.providerId;
    const baseLabel: string = params.showModelIds ? model.id : model.label;
    const label: string = params.showProviderDetails ? `${baseLabel} · ${providerLabel}` : baseLabel;
    const option: ModelSwitcherOption = {
      id: model.id,
      label,
      providerId: model.providerId,
      providerLabel,
      tags: model.tags,
    };
    options.push(option);
  }
  if (options.length > 0) {
    return options;
  }
  const fallbackOption: ModelSwitcherOption = {
    id: defaultModelId,
    label: params.showProviderDetails ? "Gemini 2.5 Flash · Google Gemini" : "Gemini 2.5 Flash",
    providerId: "google",
    providerLabel: "Google Gemini",
    tags: ["text", "fast"],
  };
  return [fallbackOption];
}

interface ChatRequestBodyParams {
  readonly messages: readonly BackendChatMessage[];
  readonly modelId: string;
  readonly byokKey: string;
}

interface ChatRequestBody {
  readonly messages: readonly BackendChatMessage[];
  readonly model?: string;
  readonly byokKey?: string;
}

function buildChatRequestBody(params: ChatRequestBodyParams): ChatRequestBody {
  const trimmedByokKey: string = params.byokKey.trim();
  const body: ChatRequestBody = {
    messages: params.messages,
    model: params.modelId,
  };
  if (trimmedByokKey.length > 0) {
    return { ...body, byokKey: trimmedByokKey };
  }
  return body;
}

interface ImageRequestBodyParams {
  readonly prompt: string;
  readonly byokKey: string;
  readonly modelId?: string;
}

interface ImageRequestBody {
  readonly prompt: string;
  readonly model?: string;
  readonly byokKey?: string;
}

function buildImageRequestBody(params: ImageRequestBodyParams): ImageRequestBody {
  const trimmedByokKey: string = params.byokKey.trim();
  const trimmedModelId: string = params.modelId?.trim() ?? "";
  const base: ImageRequestBody = {
    prompt: params.prompt,
  };
  const withModel: ImageRequestBody =
    trimmedModelId.length > 0 ? { ...base, model: trimmedModelId } : base;
  if (trimmedByokKey.length > 0) {
    return { ...withModel, byokKey: trimmedByokKey };
  }
  return withModel;
}

function buildBackendMessages(
  messages: readonly UiChatMessage[],
  imageDataUrl?: string,
): readonly BackendChatMessage[] {
  const systemMessage: BackendChatMessage = { role: "system", content: systemPrompt };
  const trimmedImage: string = imageDataUrl?.trim() ?? "";
  const hasImage: boolean = trimmedImage.length > 0;
  const chatMessages: BackendChatMessage[] = [];
  const lastIndex: number = messages.length - 1;
  for (let index: number = 0; index < messages.length; index += 1) {
    const message: UiChatMessage = messages[index];
    const base: BackendChatMessage = {
      role: message.role,
      content: message.content,
    };
    if (hasImage && message.role === "user" && index === lastIndex) {
      const withImage: BackendChatMessage = {
        ...base,
        imageDataUrl: trimmedImage,
      };
      chatMessages.push(withImage);
    } else {
      chatMessages.push(base);
    }
  }
  return [systemMessage, ...chatMessages];
}

function getImageUrlFromMessageContent(content: string): string | null {
  const prefix: string = "Generated image:";
  if (!content.startsWith(prefix)) {
    return null;
  }
  const rawUrl: string = content.slice(prefix.length).trim();
  if (!rawUrl) {
    return null;
  }
  try {
    const validated: URL = new URL(rawUrl);
    return validated.toString();
  } catch {
    return null;
  }
}

function handleCopyImageUrl(url: string): void {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return;
  }
  void navigator.clipboard.writeText(url);
}

function getMainViewTitle(view: MainView, topic: string): string {
  if (view === "projects") {
    return "Projects";
  }
  if (view === "activity") {
    return "Activity";
  }
  if (view === "settings") {
    return "Settings";
  }
  return topic;
}

function getCurrentTopic(messages: readonly UiChatMessage[]): string {
  const reversed: readonly UiChatMessage[] = [...messages].reverse();
  const lastUser: UiChatMessage | undefined = reversed.find((message) => message.role === "user");
  const source: string = lastUser?.content ?? "Generative workspace";
  const normalized: string = source.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Generative workspace";
  }
  const limit: number = 60;
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit - 1)}…`;
}

function getChatPlaceholder(mode: AssistantMode, webSearch: boolean): string {
  if (mode === "text") {
    if (webSearch) {
      return "Ask a question about your workspace or the web...";
    }
    return "Ask a question or draft a message for your workspace...";
  }
  if (mode === "image") {
    return "Describe the image you want Miro to create...";
  }
  if (mode === "both") {
    return "Ask a question and describe any images you want Miro to create...";
  }
  if (webSearch) {
    return "Ask Miro about your workspace or the web...";
  }
  return "Ask Miro about your workspace...";
}

function createInitialChatState(): ChatState {
  const id: string = createChatSessionId();
  const initialSession: ChatSession = { id, messages: [], pinned: false };
  const initialState: ChatState = {
    sessions: [initialSession],
    activeId: id,
  };
  return initialState;
}

function createChatSessionId(): string {
  const timestamp: string = Date.now().toString(10);
  return `chat-${timestamp}`;
}

function findActiveChatSession(
  sessions: readonly ChatSession[],
  activeId: string,
): ChatSession | undefined {
  return sessions.find((session: ChatSession): boolean => session.id === activeId);
}

function updateActiveSessionMessages(previous: ChatState, nextMessages: readonly UiChatMessage[]): ChatState {
  const updatedSessions: ChatSession[] = [];
  for (const session of previous.sessions) {
    if (session.id === previous.activeId) {
      const updated: ChatSession = {
        ...session,
        messages: nextMessages,
      };
      updatedSessions.push(updated);
    } else {
      updatedSessions.push(session);
    }
  }
  const nextState: ChatState = {
    sessions: updatedSessions,
    activeId: previous.activeId,
  };
  return nextState;
}

function getSessionTitle(session: ChatSession): string {
  if (session.titleOverride && session.titleOverride.trim().length > 0) {
    return session.titleOverride.trim();
  }
  return getCurrentTopic(session.messages);
}

function getChatLastActivityTimestamp(session: ChatSession): number {
  const messages: readonly UiChatMessage[] = session.messages;
  if (messages.length > 0) {
    const lastMessage: UiChatMessage = messages[messages.length - 1];
    const messageParts: string[] = lastMessage.id.split("-");
    const rawMessageTimestamp: string | undefined = messageParts[1];
    const parsedMessageTimestamp: number = rawMessageTimestamp
      ? Number.parseInt(rawMessageTimestamp, 10)
      : 0;
    if (Number.isFinite(parsedMessageTimestamp)) {
      return parsedMessageTimestamp;
    }
  }
  const sessionParts: string[] = session.id.split("-");
  const rawSessionTimestamp: string | undefined = sessionParts[1];
  const parsedSessionTimestamp: number = rawSessionTimestamp
    ? Number.parseInt(rawSessionTimestamp, 10)
    : 0;
  if (Number.isFinite(parsedSessionTimestamp)) {
    return parsedSessionTimestamp;
  }
  return 0;
}
