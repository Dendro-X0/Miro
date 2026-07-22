"use client";

import type { ReactElement, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { Download, Menu, MessageSquareText, Settings, X } from "lucide-react";
import SettingsView from "./settings/settings-view";
import { useSettings } from "./_settings-store";
import type {
  AssistantMode,
  MainView,
  SidebarChatSummary,
} from "./shell/types";
import SidebarContent from "./shell/sidebar";
import ModelSwitcher from "./shell/model-switcher";
import ChatInputBar from "./shell/chat-input";
import SampleMessages from "./shell/sample-messages";
import GalleryView from "./shell/gallery-view";
import PlaceholderView from "./shell/placeholder-view";
import ChatInstructionsPanel from "./shell/chat-instructions-panel";
import ChatMessageBubble from "./shell/chat-message-bubble";
import AssistantModeRow from "./modules/ui/components/chat/assistant-mode-row";
import ChatErrorBanner from "./modules/ui/components/chat/chat-error-banner";
import { miroApi, getChatEndpoint } from "./lib/miro-api";
import {
  createChatSession,
  deleteChatSession,
  getChatSessionInstructions,
  isEncryptedChatHistory,
  listChatSessions,
  loadChatMessages,
  pinChatSession,
  renameChatSession,
  saveChatMessage,
  setChatSessionInstructions,
  titleFromPrompt,
  truncateChatMessagesAfter,
  type ChatSessionSummary,
} from "./lib/chat-history";
import { chatExportFilename, downloadMarkdownFile, formatChatMarkdown } from "./lib/export-chat";
import {
  deleteGalleryAsset,
  isEncryptedGallery,
  listGalleryAssets,
  saveGalleryAsset,
  type GalleryAsset,
} from "./lib/gallery";
import {
  deserializeMessageContent,
  getUiMessageParts,
  recordsToUiMessages,
  serializeMessageContent,
  supportsVisionProvider,
  type StoredMessagePart,
} from "./lib/message-parts";
import { formatGeneratedImageContent } from "@miro/core";
import type { ChatImageAttachmentInput } from "./shell/types";
import { useAiModelCatalog } from "./lib/use-ai-model-catalog";
import { providerHasCredentials } from "./lib/ai-model-catalog";

interface AppShellProps {
  readonly children?: ReactNode;
}

const defaultModelId: string = "gemini-2.5-flash";

function getChatPlaceholder(mode: AssistantMode): string {
  if (mode === "image") return "Describe an image to generate...";
  return "Type a message...";
}

function toSidebarChats(sessions: readonly ChatSessionSummary[]): readonly SidebarChatSummary[] {
  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    pinned: session.pinned,
  }));
}

export default function AppShell(props: AppShellProps): ReactElement {
  const { children } = props;
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [view, setView] = useState<MainView>("today");
  const [assistantMode, setAssistantMode] = useState<AssistantMode>("auto");
  const [historyReady, setHistoryReady] = useState<boolean>(false);
  const [sessionInstructions, setSessionInstructions] = useState<string>("");
  const [showInstructionsPanel, setShowInstructionsPanel] = useState<boolean>(false);
  const { settings, updateSettings, resetSettings } = useSettings();

  const modelId: string = settings.aiView.selectedModelId || defaultModelId;
  const imageModelId: string = settings.aiView.selectedImageModelId;
  const byokKey: string = settings.aiView.byokKey;
  const byokBaseUrl: string = settings.aiView.byokBaseUrl ?? "";
  const selectedProviderId: string = settings.aiView.selectedProviderId || "google";
  const defaultSystemPrompt: string = settings.aiView.defaultSystemPrompt ?? "";
  const { switcherOptions, loading: catalogLoading, runtime: aiRuntime } = useAiModelCatalog(
    settings.aiView,
  );
  const providerReady = providerHasCredentials(
    aiRuntime,
    selectedProviderId,
    byokKey,
    settings.aiView.byokProvider,
  );
  const persistHistory: boolean =
    isEncryptedChatHistory() || settings.data.storeConversationHistory;

  const [sessions, setSessions] = useState<readonly SidebarChatSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [galleryAssets, setGalleryAssets] = useState<readonly GalleryAsset[]>([]);
  const [imageBusy, setImageBusy] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string>("");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  function setActiveSession(sessionId: string): void {
    activeSessionIdRef.current = sessionId;
    setActiveSessionId(sessionId);
  }

  async function refreshGallery(): Promise<void> {
    setGalleryAssets(await listGalleryAssets());
  }

  async function refreshSessions(): Promise<readonly SidebarChatSummary[]> {
    const next = toSidebarChats(await listChatSessions());
    setSessions(next);
    return next;
  }

  async function maybeAutoTitle(sessionId: string, prompt: string): Promise<void> {
    const currentList = await listChatSessions();
    const current = currentList.find((session) => session.id === sessionId);
    if (!current || (current.title !== "New chat" && current.title !== "Untitled chat")) {
      return;
    }
    await renameChatSession(sessionId, titleFromPrompt(prompt));
  }

  async function persistMessage(role: string, content: string, messageId?: string): Promise<void> {
    if (!persistHistory || !activeSessionIdRef.current || !content.trim()) {
      return;
    }
    await saveChatMessage(activeSessionIdRef.current, role, content, messageId);
    if (role === "user") {
      const text =
        deserializeMessageContent(content).find((part) => part.type === "text")?.text ?? content;
      await maybeAutoTitle(activeSessionIdRef.current, text);
    }
    await refreshSessions();
  }

  async function loadSession(sessionId: string): Promise<void> {
    const [records, instructions] = await Promise.all([
      loadChatMessages(sessionId),
      getChatSessionInstructions(sessionId),
    ]);
    setMessages(recordsToUiMessages(records));
    setSessionInstructions(instructions);
    setActiveSession(sessionId);
  }

  const combinedSystemPrompt = useMemo((): string => {
    const parts = [defaultSystemPrompt.trim(), sessionInstructions.trim()].filter(
      (value) => value.length > 0,
    );
    return parts.join("\n\n");
  }, [defaultSystemPrompt, sessionInstructions]);

  const chatBody = useMemo(
    () => ({
      model: modelId,
      provider: selectedProviderId,
      byokKey: byokKey || undefined,
      baseUrl: byokBaseUrl.trim() || undefined,
      systemPrompt: combinedSystemPrompt || undefined,
    }),
    [modelId, selectedProviderId, byokKey, byokBaseUrl, combinedSystemPrompt],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { messages, setMessages, append, isLoading, error, reload, stop } = useChat({
    api: getChatEndpoint(),
    body: chatBody,
    onFinish: (message: UIMessage) => {
      void persistMessage(
        message.role,
        serializeMessageContent(getUiMessageParts(message)),
        message.id,
      );
    },
    onError: (err: unknown) => {
      console.error("Chat error:", err);
    },
  } as any) as any;

  useEffect(() => {
    void (async () => {
      if (!persistHistory) {
        setSessions([]);
        setActiveSession("");
        setMessages([]);
        setHistoryReady(true);
        return;
      }
      const existing = await refreshSessions();
      if (existing.length > 0) {
        await loadSession(existing[0].id);
        setHistoryReady(true);
        return;
      }
      const created = await createChatSession("New chat");
      setSessions([{ id: created.id, title: created.title, pinned: created.pinned }]);
      setActiveSession(created.id);
      setMessages([]);
      setHistoryReady(true);
    })();
    // Intentionally run when persistence preference changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistHistory, setMessages]);

  useEffect(() => {
    void refreshGallery();
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  function handleToggleSettingsView(): void {
    setView((v) => (v === "settings" ? "today" : "settings"));
  }

  function handleChangeModel(nextModelId: string): void {
    const option = switcherOptions.find((item) => item.id === nextModelId);
    updateSettings({
      aiView: {
        selectedModelId: nextModelId,
        ...(option ? { selectedProviderId: option.providerId } : {}),
      },
    });
  }

  function handleChangeImageModel(nextImageModelId: string): void {
    updateSettings({ aiView: { selectedImageModelId: nextImageModelId } });
  }

  async function handleNewChat(): Promise<void> {
    if (!persistHistory) {
      setMessages([]);
      setMobileSidebarOpen(false);
      return;
    }
    const created = await createChatSession("New chat");
    setSessions((previous) => [
      { id: created.id, title: created.title, pinned: created.pinned },
      ...previous,
    ]);
    setActiveSession(created.id);
    setMessages([]);
    setSessionInstructions("");
    setView("today");
    setMobileSidebarOpen(false);
  }

  async function handleSelectChat(chatId: string): Promise<void> {
    if (!persistHistory) {
      return;
    }
    await loadSession(chatId);
    setView("today");
    setMobileSidebarOpen(false);
  }

  async function handleDeleteChat(chatId: string): Promise<void> {
    if (!persistHistory) {
      setMessages([]);
      return;
    }
    await deleteChatSession(chatId);
    const refreshed = await refreshSessions();
    if (refreshed.length === 0) {
      await handleNewChat();
      return;
    }
    if (activeSessionIdRef.current === chatId) {
      await loadSession(refreshed[0].id);
    }
  }

  async function handleRenameChat(chatId: string, title: string): Promise<void> {
    if (!persistHistory) {
      return;
    }
    const updated = await renameChatSession(chatId, title);
    setSessions((previous) =>
      previous.map((session) =>
        session.id === chatId ? { ...session, title: updated.title } : session,
      ),
    );
  }

  async function handleTogglePinChat(chatId: string): Promise<void> {
    if (!persistHistory) {
      return;
    }
    const current = sessions.find((session) => session.id === chatId);
    if (!current) {
      return;
    }
    await pinChatSession(chatId, !current.pinned);
    await refreshSessions();
  }

  async function handleSendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    if (persistHistory && !activeSessionIdRef.current) {
      const created = await createChatSession("New chat");
      setSessions((previous) => [
        { id: created.id, title: created.title, pinned: created.pinned },
        ...previous,
      ]);
      setActiveSession(created.id);
    }
    const parts: StoredMessagePart[] = [{ type: "text", text: trimmed }];
    const messageId = crypto.randomUUID();
    await append({
      id: messageId,
      role: "user",
      parts: [{ type: "text", text: trimmed }],
    });
    await persistMessage("user", serializeMessageContent(parts), messageId);
  }

  async function handleAttachImage(input: ChatImageAttachmentInput): Promise<void> {
    if (!supportsVisionProvider(selectedProviderId)) {
      return;
    }
    const prompt = input.prompt.trim() || "What's in this image?";
    if (persistHistory && !activeSessionIdRef.current) {
      const created = await createChatSession("New chat");
      setSessions((previous) => [
        { id: created.id, title: created.title, pinned: created.pinned },
        ...previous,
      ]);
      setActiveSession(created.id);
    }
    const parts: StoredMessagePart[] = [
      { type: "text", text: prompt },
      { type: "image", image: input.dataUrl },
    ];
    const messageId = crypto.randomUUID();
    await append({
      id: messageId,
      role: "user",
      parts: [
        { type: "text", text: prompt },
        { type: "image", image: input.dataUrl },
      ],
    });
    await persistMessage("user", serializeMessageContent(parts), messageId);
  }

  async function handleRegenerate(): Promise<void> {
    const lastAssistantIndex = messages.findLastIndex(
      (message: UIMessage) => message.role === "assistant",
    );
    if (lastAssistantIndex < 0 || !activeSessionIdRef.current) {
      return;
    }
    const lastAssistant = messages[lastAssistantIndex];
    await truncateChatMessagesAfter(activeSessionIdRef.current, lastAssistant.id);
    setMessages(messages.slice(0, lastAssistantIndex));
    await reload();
  }

  async function handleEditUser(messageId: string, nextText: string): Promise<void> {
    const trimmed = nextText.trim();
    if (!trimmed || !activeSessionIdRef.current) {
      return;
    }
    const messageIndex = messages.findIndex((message: UIMessage) => message.id === messageId);
    if (messageIndex < 0) {
      return;
    }
    await truncateChatMessagesAfter(activeSessionIdRef.current, messageId);
    setMessages(messages.slice(0, messageIndex));
    const existingParts = getUiMessageParts(messages[messageIndex]);
    const imageParts = existingParts.filter((part) => part.type === "image");
    const parts: StoredMessagePart[] = [{ type: "text", text: trimmed }, ...imageParts];
    const nextId = crypto.randomUUID();
    await append({
      id: nextId,
      role: "user",
      parts: parts.map((part) =>
        part.type === "text"
          ? { type: "text" as const, text: part.text }
          : { type: "image" as const, image: part.image },
      ),
    });
    await persistMessage("user", serializeMessageContent(parts), nextId);
  }

  async function handleSaveSessionInstructions(): Promise<void> {
    if (!activeSessionIdRef.current) {
      return;
    }
    await setChatSessionInstructions(activeSessionIdRef.current, sessionInstructions);
  }

  async function handleExportChat(): Promise<void> {
    if (!activeSessionIdRef.current) {
      return;
    }
    const sessionId = activeSessionIdRef.current;
    const title = sessions.find((session) => session.id === sessionId)?.title ?? "Chat";
    const records = await loadChatMessages(sessionId);
    const markdown = formatChatMarkdown({
      title,
      instructions: [defaultSystemPrompt, sessionInstructions]
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .join("\n\n"),
      messages: records,
    });
    downloadMarkdownFile(chatExportFilename(title), markdown);
  }

  async function handleGenerateImage(prompt: string): Promise<void> {
    if (!prompt.trim()) return;

    if (persistHistory && !activeSessionIdRef.current) {
      const created = await createChatSession("New chat");
      setSessions((previous) => [
        { id: created.id, title: created.title, pinned: created.pinned },
        ...previous,
      ]);
      setActiveSession(created.id);
    }

    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();
    const newMessages: UIMessage[] = [
      ...messages,
      {
        id: userMsgId,
        role: "user",
        parts: [{ type: "text", text: prompt }],
      } as UIMessage,
    ];
    setMessages(newMessages);
    setImageError(null);
    setImageBusy(true);
    await persistMessage("user", prompt, userMsgId);

    try {
      const data = await miroApi.generateImage({
        prompt,
        model: imageModelId,
        provider: selectedProviderId,
        byokKey: byokKey || undefined,
        baseUrl: byokBaseUrl.trim() || undefined,
      });
      if (data.images.length > 0) {
        const imageUrl = data.images[0].url;
        const assistantText = formatGeneratedImageContent(imageUrl);
        setMessages([
          ...newMessages,
          {
            id: assistantMsgId,
            role: "assistant",
            parts: [{ type: "text", text: assistantText }],
          } as UIMessage,
        ]);
        await persistMessage("assistant", assistantText, assistantMsgId);
        await saveGalleryAsset({
          prompt,
          dataUrl: imageUrl,
          sessionId: activeSessionIdRef.current || null,
        });
        await refreshGallery();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate image";
      setImageError(message);
    } finally {
      setImageBusy(false);
    }
  }

  async function handleDeleteGalleryAsset(assetId: string): Promise<void> {
    await deleteGalleryAsset(assetId);
    await refreshGallery();
  }

  const historyHint = isEncryptedChatHistory()
    ? "Encrypted on this device"
    : persistHistory
      ? "Saved in this browser"
      : "History off";

  const sidebar = (
    <SidebarContent
      workspaceName={settings.profile.workspaceName}
      view={view}
      onChangeView={(nextView) => {
        setView(nextView);
        setMobileSidebarOpen(false);
      }}
      chats={sessions}
      activeChatId={activeSessionId}
      onSelectChat={(chatId) => void handleSelectChat(chatId)}
      onNewChat={() => void handleNewChat()}
      onTogglePinChat={(chatId) => void handleTogglePinChat(chatId)}
      onRenameChat={(chatId, title) => void handleRenameChat(chatId, title)}
      onDeleteChat={(chatId) => void handleDeleteChat(chatId)}
    />
  );

  return (
    <div className="miro-gradient-shell min-h-screen text-foreground">
      <div className="flex min-h-screen w-full max-w-full gap-0 px-0 py-0 md:gap-4 md:px-4 md:py-4 lg:px-6 xl:px-10">
        <aside className="hidden w-64 flex-col rounded-none surface-panel-muted p-4 backdrop-blur md:rounded-3xl lg:flex">
          {sidebar}
          <p className="mt-auto pt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
            {historyHint}
          </p>
        </aside>

        {mobileSidebarOpen ? (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Close sidebar"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative z-10 flex h-full w-72 flex-col surface-panel-muted p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Chats</span>
                <button
                  type="button"
                  className="rounded-full p-2 hover:bg-surface"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {sidebar}
              <p className="mt-auto pt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
                {historyHint}
              </p>
            </div>
          </div>
        ) : null}

        <main className="flex w-full max-w-full flex-1 flex-col rounded-none surface-panel p-2 md:rounded-3xl md:p-4 backdrop-blur">
          <header className="relative z-20 mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="p-2 lg:hidden"
                aria-label="Open chats"
              >
                <Menu />
              </button>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-widest text-sky-400">
                  Miro
                </span>
                <h1 className="text-lg font-semibold">
                  {view === "settings"
                    ? "Settings"
                    : view === "gallery"
                      ? "Gallery"
                      : view === "activity"
                        ? "Activity"
                        : "Chat"}
                </h1>
              </div>
            </div>
            <div className="flex gap-2">
              {view === "today" && persistHistory && activeSessionId ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowInstructionsPanel((open) => !open)}
                    className="rounded-full bg-surface-muted p-2"
                    aria-label="Chat instructions"
                    aria-pressed={showInstructionsPanel}
                  >
                    <MessageSquareText className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExportChat()}
                    className="rounded-full bg-surface-muted p-2"
                    aria-label="Export chat as Markdown"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </>
              ) : null}
              <ModelSwitcher
                value={modelId}
                onChange={handleChangeModel}
                imageModelId={imageModelId}
                onChangeImageModel={handleChangeImageModel}
                options={switcherOptions}
                selectedProviderId={selectedProviderId}
                ready={providerReady}
                loading={catalogLoading}
              />
              <button
                type="button"
                onClick={handleToggleSettingsView}
                className="rounded-full bg-surface-muted p-2"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </header>

          {view === "today" && (
            <section className="flex min-h-0 flex-1 flex-col gap-3 pb-4">
              {showInstructionsPanel ? (
                <ChatInstructionsPanel
                  globalPrompt={defaultSystemPrompt}
                  sessionInstructions={sessionInstructions}
                  onChangeSessionInstructions={setSessionInstructions}
                  onSaveSessionInstructions={() => void handleSaveSessionInstructions()}
                />
              ) : null}
              <div
                ref={scrollContainerRef}
                className="flex-1 space-y-3 overflow-y-auto pb-3 pr-1"
              >
                {!historyReady ? (
                  <p className="px-2 text-sm text-muted-foreground">Loading chats…</p>
                ) : null}
                {historyReady && messages.length === 0 &&
                  (children || (
                    <SampleMessages
                      onExampleClick={(txt) => void handleSendMessage(txt)}
                    />
                  ))}
                {messages.map((message: UIMessage, index: number) => {
                  const isLastAssistant =
                    message.role === "assistant" &&
                    messages.findLastIndex((item: UIMessage) => item.role === "assistant") ===
                      index;
                  return (
                    <ChatMessageBubble
                      key={message.id}
                      message={message}
                      isLastAssistant={isLastAssistant}
                      onRegenerate={() => void handleRegenerate()}
                      onEditUser={(messageId, nextText) =>
                        void handleEditUser(messageId, nextText)
                      }
                    />
                  );
                })}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-2xl surface-bubble-muted px-3 py-1.5 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                      <span>Miro is thinking...</span>
                    </div>
                  </div>
                )}
                {error && (
                  <ChatErrorBanner
                    message={error.message}
                    onRetry={reload}
                    onDismiss={stop}
                  />
                )}
              </div>

              <div className="mt-1">
                <AssistantModeRow mode={assistantMode} onChangeMode={setAssistantMode} />
              </div>
              {imageError ? (
                <ChatErrorBanner
                  message={imageError}
                  onRetry={() => setImageError(null)}
                  onDismiss={() => setImageError(null)}
                />
              ) : null}
              <ChatInputBar
                onSend={(txt) => void handleSendMessage(txt)}
                onGenerateImage={handleGenerateImage}
                onAttachImage={
                  supportsVisionProvider(selectedProviderId) && assistantMode !== "image"
                    ? (input) => void handleAttachImage(input)
                    : undefined
                }
                sending={isLoading || imageBusy}
                placeholder={getChatPlaceholder(assistantMode)}
              />
            </section>
          )}

          {view === "gallery" && (
            <GalleryView
              assets={galleryAssets}
              encrypted={isEncryptedGallery()}
              onDelete={(assetId) => void handleDeleteGalleryAsset(assetId)}
            />
          )}

          {view === "activity" && (
            <PlaceholderView
              title="Activity"
              description="Usage and recent actions will land here in a later release."
            />
          )}

          {view === "settings" && (
            <SettingsView
              settings={settings}
              onUpdate={updateSettings}
              onReset={resetSettings}
            />
          )}
        </main>
      </div>
    </div>
  );
}
