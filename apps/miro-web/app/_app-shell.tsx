"use client";

import type { ChangeEvent, FormEvent, KeyboardEvent, MutableRefObject, ReactElement, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUpCircle, ChevronDown, Loader2, Menu, Mic, Settings, Sparkles } from "lucide-react";
import ThemeToggle from "./_theme-toggle";
import SettingsView from "./_settings-view";
import { useSettings } from "./_settings-store";

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

interface ChatInputBarProps {
  readonly onSend: (content: string) => Promise<void> | void;
  readonly sending: boolean;
}

interface ModelSwitcherProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly ready?: boolean;
}

type MainView = "today" | "settings";

interface SidebarContentProps {
  readonly workspaceName: string;
}

const defaultModelId: string = "balanced";
const defaultApiBaseUrl: string = process.env.NEXT_PUBLIC_MIRO_API_BASE_URL ?? "http://localhost:8787";
const systemPrompt: string = "You are the Miro workspace assistant.";
const maxTextareaHeightPx: number = 160;

/** High-level application shell with sidebar, chat area, and theming. */
export default function AppShell(props: AppShellProps): ReactElement {
  const { children } = props;
  const [model, setModel] = useState<string>(defaultModelId);
  const [messages, setMessages] = useState<readonly UiChatMessage[]>([]);
  const [sending, setSending] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<MainView>("today");
  const { settings, updateSettings, resetSettings } = useSettings();
  const scrollContainerRef: MutableRefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null);

  function handleOpenMobileSidebar(): void {
    setMobileSidebarOpen(true);
  }

  function handleCloseMobileSidebar(): void {
    setMobileSidebarOpen(false);
  }

  function handleToggleSettingsView(): void {
    const nextView: MainView = view === "settings" ? "today" : "settings";
    setView(nextView);
    setMobileSidebarOpen(false);
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
    const nextMessages: readonly UiChatMessage[] = [...messages, userMessage];
    setMessages(nextMessages);
    setError(null);
    setSending(true);
    try {
      const backendMessages: readonly BackendChatMessage[] = buildBackendMessages(nextMessages);
      const response: Response = await fetch(`${defaultApiBaseUrl}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: backendMessages, model }),
      });
      if (!response.ok) {
        setError("Unable to reach Miro right now. Please try again in a moment.");
        return;
      }
      const body: AiChatResponseBody = (await response.json()) as AiChatResponseBody;
      const firstChoice: BackendChatCompletionChoice | undefined = body.completion.choices[0];
      const assistantContent: string | undefined = firstChoice?.message.content;
      if (!assistantContent) {
        setError("Received an empty response from Miro. Please try again.");
        return;
      }
      const assistantMessage: UiChatMessage = {
        id: `assistant-${Date.now().toString(10)}`,
        role: "assistant",
        content: assistantContent,
      };
      setMessages([...nextMessages, assistantMessage]);
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
      const response: Response = await fetch(`${defaultApiBaseUrl}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: backendMessages, model }),
      });
      if (!response.ok) {
        setError("Unable to reach Miro right now. Please try again in a moment.");
        return;
      }
      const body: AiChatResponseBody = (await response.json()) as AiChatResponseBody;
      const firstChoice: BackendChatCompletionChoice | undefined = body.completion.choices[0];
      const assistantContent: string | undefined = firstChoice?.message.content;
      if (!assistantContent) {
        setError("Received an empty response from Miro. Please try again.");
        return;
      }
      const assistantMessage: UiChatMessage = {
        id: `assistant-${Date.now().toString(10)}`,
        role: "assistant",
        content: assistantContent,
      };
      setMessages([...activeMessages, assistantMessage]);
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

  const hasMessages: boolean = messages.length > 0;
  const topic: string = getCurrentTopic(messages);

  return (
    <div className="miro-gradient-shell min-h-screen text-foreground">
      <div className="flex min-h-screen w-full max-w-full gap-0 px-0 py-0 md:gap-4 md:px-4 md:py-4 lg:px-6 xl:px-10">
        <aside className="hidden w-64 flex-col rounded-none surface-panel-muted p-4 backdrop-blur md:rounded-3xl lg:flex">
          <SidebarContent workspaceName={settings.profile.workspaceName} />
        </aside>
        <main className="flex w-full max-w-full flex-1 flex-col rounded-none surface-panel p-2 md:rounded-3xl md:p-4 backdrop-blur">
          <header className="mb-3 flex items-center justify-between gap-3">
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
                  {view === "settings" ? "Settings" : topic}
                </h1>
              </div>
              <div className="flex items-center md:hidden">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-400">Topic</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ModelSwitcher value={model} onChange={setModel} />
              <button
                type="button"
                onClick={handleToggleSettingsView}
                aria-label={view === "settings" ? "Close settings" : "Open settings"}
                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-surface bg-surface-muted text-foreground hover:border-sky-400/80 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="sm:hidden">
                <ThemeToggle compact />
              </div>
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
            </div>
          </header>
          {view === "today" && (
            <section className="flex min-h-0 flex-1 flex-col gap-3 pb-4" aria-label="Chat">
              <div
                ref={scrollContainerRef}
                className="flex-1 space-y-3 overflow-y-auto pr-1 chat-scroll-touch"
                role="log"
                aria-live="polite"
                aria-relevant="additions"
              >
                {!hasMessages && (children ?? <SampleMessages />)}
                {messages.map((message) => {
                  const isUser: boolean = message.role === "user";
                  const alignment: string = isUser ? "justify-end" : "justify-start";
                  const bubbleClass: string = isUser
                    ? "chat-bubble-enter bg-sky-500/90 text-slate-950"
                    : "chat-bubble-enter surface-bubble-muted text-foreground";
                  return (
                    <div key={message.id} className={`flex ${alignment}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${bubbleClass}`}>
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
              </div>
              {error && (
                <div
                  className="flex items-center justify-between gap-3 rounded-2xl border border-red-500/60 bg-red-500/5 px-3 py-2 text-[11px] text-red-700 dark:bg-red-500/10 dark:text-red-200"
                  role="alert"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-300" aria-hidden="true" />
                    <p className="text-left">{error}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRetryLastMessage}
                      className="rounded-xl bg-red-500/90 px-2.5 py-1 text-[11px] font-medium text-slate-950 shadow-sm hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissError}
                      className="text-[11px] text-red-600 hover:text-red-800 focus-visible:outline-none focus-visible:underline dark:text-red-200 dark:hover:text-red-100"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              <ChatInputBar onSend={handleSendMessage} sending={sending} />
            </section>
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
            <SidebarContent workspaceName={settings.profile.workspaceName} />
          </div>
        </div>
      )}
    </div>
  );
}

function ModelSwitcher(props: ModelSwitcherProps): ReactElement {
  const { value, onChange, ready } = props;
  const [open, setOpen] = useState<boolean>(false);

  const options: readonly { readonly id: string; readonly label: string }[] = [
    { id: "fast", label: "Fast" },
    { id: "balanced", label: "Balanced" },
    { id: "creative", label: "Creative" },
  ];

  const current = options.find((option) => option.id === value) ?? options[1];

  function handleToggle(): void {
    setOpen((previous) => !previous);
  }

  function handleSelect(id: string): void {
    onChange(id);
    setOpen(false);
  }

  return (
    <div className="relative inline-flex items-center rounded-full border border-surface bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted"
      >
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Model</span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-foreground">
          {current.label}
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {ready === false && (
        <p className="ml-2 text-[10px] font-medium text-red-400">AI provider not connected</p>
      )}
      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-2 w-40 rounded-2xl border-surface bg-surface text-xs shadow-lg"
          role="listbox"
          aria-label="Select model"
        >
          {options.map((option) => {
            const active: boolean = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={(): void => handleSelect(option.id)}
                className={
                  active
                    ? "flex w-full items-center justify-between rounded-2xl bg-sky-500/10 px-3 py-2 text-foreground"
                    : "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-muted-foreground hover:bg-surface-muted"
                }
              >
                <span>{option.label}</span>
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SampleMessages(): ReactElement {
  return (
    <div className="flex h-full items-center justify-center px-3 text-center">
      <div className="relative w-full max-w-2xl">
        <div
          className="pointer-events-none absolute -inset-10 rounded-[40px] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.18),_transparent_65%)] opacity-80 blur-3xl dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.3),_transparent_70%)]"
          aria-hidden="true"
        />
        <div className="relative overflow-hidden rounded-[26px] border border-surface bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.94),_rgba(15,23,42,0.88)),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.92),_rgba(15,23,42,0.9))] px-8 py-9 shadow-[0_0_60px_rgba(56,189,248,0.32)] backdrop-blur-xl dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.98),_rgba(15,23,42,0.94)),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.96),_rgba(30,64,175,0.98))]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">
            Welcome to your Miro workspace
          </p>
          <h2 className="mt-3 bg-gradient-to-r from-sky-500 via-cyan-300 to-violet-400 bg-clip-text text-3xl font-semibold leading-tight text-transparent dark:from-sky-300 dark:via-cyan-200 dark:to-violet-300">
            Ask anything, just like in your favorite chat apps.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Use the box below to explore boards, plan projects, or get quick answers about what is happening
            in your workspace.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatInputBar(props: ChatInputBarProps): ReactElement {
  const { onSend, sending } = props;
  const [value, setValue] = useState<string>("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    sendCurrentValue();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendCurrentValue();
    }
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    const nextValue: string = event.target.value;
    setValue(nextValue);
    autoResizeTextarea(event.target);
  }

  function sendCurrentValue(): void {
    const trimmed: string = value.trim();
    if (!trimmed || sending) {
      return;
    }
    onSend(trimmed);
    setValue("");
  }

  const disableSend: boolean = sending || value.trim().length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Chat input"
      className="surface-panel bg-surface-muted flex items-center gap-3 rounded-2xl px-3 py-2 chat-input-safe shadow-[0_0_40px_rgba(56,189,248,0.25)]"
    >
      <p id="chat-input-help" className="sr-only">
        Press Enter to send. Press Shift and Enter for a new line.
      </p>
      <button
        type="button"
        disabled={sending}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-surface bg-surface-muted text-foreground hover:border-sky-400/80 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted"
      >
        <Mic className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Start voice input</span>
      </button>
      <textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder="Ask Miro about your workspace..."
        aria-label="Chat message"
        aria-describedby="chat-input-help"
        className="max-h-32 flex-1 resize-none overflow-y-auto bg-transparent py-2 text-sm text-foreground placeholder:text-slate-500 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      />
      <button
        type="submit"
        disabled={disableSend}
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-slate-950 shadow-lg hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowUpCircle className="h-5 w-5" aria-hidden="true" />
        )}
        <span className="sr-only">Send message</span>
      </button>
    </form>
  );
}

function SidebarContent(props: SidebarContentProps): ReactElement {
  const { workspaceName } = props;
  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 text-slate-950">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground">Workspace</span>
          <span className="text-sm font-semibold text-foreground">{workspaceName}</span>
        </div>
      </div>
      <section className="flex flex-1 flex-col justify-between text-xs text-muted-foreground">
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

function buildBackendMessages(messages: readonly UiChatMessage[]): readonly BackendChatMessage[] {
  const systemMessage: BackendChatMessage = { role: "system", content: systemPrompt };
  const chatMessages: readonly BackendChatMessage[] = messages.map((message) => {
    const role: "user" | "assistant" = message.role;
    return { role, content: message.content };
  });
  return [systemMessage, ...chatMessages];
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

function autoResizeTextarea(element: HTMLTextAreaElement): void {
  const elementRef: HTMLTextAreaElement = element;
  elementRef.style.height = "0px";
  const nextHeight: number = Math.min(elementRef.scrollHeight, maxTextareaHeightPx);
  elementRef.style.height = `${nextHeight}px`;
}
