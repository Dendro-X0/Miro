"use client";

import type { ChangeEvent, FormEvent, KeyboardEvent, MutableRefObject, ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowUpCircle, Image as ImageIcon, Loader2, Mic, MicOff, Paperclip } from "lucide-react";
import type { ChatInputBarProps } from "../../../../shell/types";

type SpeechRecognitionConstructor = new () => SpeechRecognition;

interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly 0: SpeechRecognitionAlternative;
  readonly length: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const maxTextareaHeightPx: number = 160;

function createSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === "undefined") {
    return null;
  }
  const recognitionConstructor: SpeechRecognitionConstructor | undefined =
    window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!recognitionConstructor) {
    return null;
  }
  const recognition: SpeechRecognition = new recognitionConstructor();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  return recognition;
}

function autoResizeTextarea(element: HTMLTextAreaElement): void {
  const elementRef: HTMLTextAreaElement = element;
  elementRef.style.height = "0px";
  const nextHeight: number = Math.min(elementRef.scrollHeight, maxTextareaHeightPx);
  elementRef.style.height = `${nextHeight}px`;
}

export default function ChatInputBar(props: ChatInputBarProps): ReactElement {
  const { onSend, onGenerateImage, onAttachImage, sending, onFocus, placeholder } = props;
  const [value, setValue] = useState<string>("");
  const [listening, setListening] = useState<boolean>(false);
  const [voiceSupported, setVoiceSupported] = useState<boolean>(true);
  const fileInputRef: MutableRefObject<HTMLInputElement | null> = useRef<HTMLInputElement | null>(null);
  const recognitionRef: MutableRefObject<SpeechRecognition | null> = useRef<SpeechRecognition | null>(null);

  useEffect((): void => {
    if (typeof window === "undefined") {
      setVoiceSupported(false);
      return;
    }
    const hasStandard: boolean = window.SpeechRecognition !== undefined;
    const hasWebkit: boolean = window.webkitSpeechRecognition !== undefined;
    const supported: boolean = hasStandard || hasWebkit;
    setVoiceSupported(supported);
  }, []);

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

  function handleFocus(): void {
    if (!onFocus) {
      return;
    }
    onFocus();
  }

  function appendTranscript(transcript: string): void {
    const trimmedTranscript: string = transcript.trim();
    if (!trimmedTranscript) {
      return;
    }
    setValue((previous: string): string => {
      const trimmedPrevious: string = previous.trim();
      if (!trimmedPrevious) {
        return trimmedTranscript;
      }
      return `${trimmedPrevious} ${trimmedTranscript}`;
    });
  }

  function startVoiceInput(): void {
    if (!voiceSupported || sending) {
      return;
    }
    const existing: SpeechRecognition | null = recognitionRef.current;
    const recognition: SpeechRecognition | null = existing ?? createSpeechRecognition();
    if (!recognition) {
      return;
    }
    if (!existing) {
      recognition.onresult = (event: SpeechRecognitionEvent): void => {
        const lastIndex: number = event.results.length - 1;
        if (lastIndex < 0) {
          return;
        }
        const result: SpeechRecognitionResult = event.results.item(lastIndex);
        const alternative: SpeechRecognitionAlternative = result[0];
        appendTranscript(alternative.transcript);
      };
      recognition.onerror = (): void => {
        setListening(false);
      };
      recognition.onend = (): void => {
        setListening(false);
      };
      recognitionRef.current = recognition;
    }
    recognition.start();
    setListening(true);
  }

  function stopVoiceInput(): void {
    const recognition: SpeechRecognition | null = recognitionRef.current;
    if (!recognition) {
      return;
    }
    recognition.stop();
    setListening(false);
  }

  function handleVoiceButtonClick(): void {
    if (listening) {
      stopVoiceInput();
      return;
    }
    startVoiceInput();
  }

  function sendCurrentValue(): void {
    const trimmed: string = value.trim();
    if (!trimmed || sending) {
      return;
    }
    if (listening) {
      stopVoiceInput();
    }
    onSend(trimmed);
    setValue("");
  }

  function handleGenerateImageClick(): void {
    const trimmed: string = value.trim();
    if (!onGenerateImage || sending || !trimmed) {
      return;
    }
    onGenerateImage(trimmed);
    setValue("");
  }

  function handleAttachImageClick(): void {
    if (!onAttachImage || sending) {
      return;
    }
    const input: HTMLInputElement | null = fileInputRef.current;
    if (!input) {
      return;
    }
    input.value = "";
    input.click();
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>): void {
    if (!onAttachImage || sending) {
      return;
    }
    const fileList: FileList | null = event.target.files;
    if (!fileList || fileList.length === 0) {
      return;
    }
    const file: File = fileList[0];
    const reader: FileReader = new FileReader();
    const prompt: string = value.trim();
    reader.onload = (): void => {
      const result: unknown = reader.result;
      if (typeof result !== "string") {
        return;
      }
      const dataUrl: string = result;
      void onAttachImage({ dataUrl, prompt });
    };
    reader.readAsDataURL(file);
  }

  const disableSend: boolean = sending || value.trim().length === 0;
  const voiceButtonBaseClassName: string =
    "flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-muted text-foreground disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted";
  const idleBorderClassName: string =
    "border border-surface hover:border-sky-400/80 hover:text-sky-300";
  const listeningBorderClassName: string = "border border-sky-400/80 text-sky-200";
  const voiceButtonClassName: string = `${voiceButtonBaseClassName} ${
    listening && voiceSupported ? listeningBorderClassName : idleBorderClassName
  }`;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Chat input"
      className="surface-panel bg-surface-muted flex items-center gap-3 rounded-2xl px-3 py-2 chat-input-safe shadow-[0_0_40px_rgba(56,189,248,0.25)]"
    >
      <p id="chat-input-help" className="sr-only">
        Press Enter to send. Press Shift and Enter for a new line.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <button
        type="button"
        disabled={sending}
        onClick={voiceSupported ? handleVoiceButtonClick : handleGenerateImageClick}
        className={voiceButtonClassName}
      >
        {voiceSupported ? (
          <span className="inline-flex items-center gap-1">
            {listening ? (
              <MicOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Mic className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="sr-only">
              {listening ? "Stop voice input" : "Start voice input"}
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Generate image from prompt</span>
          </span>
        )}
      </button>
      <textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        rows={1}
        placeholder={placeholder ?? "Ask Miro about your workspace..."}
        aria-label="Chat message"
        aria-describedby="chat-input-help"
        className="max-h-32 flex-1 resize-none overflow-y-auto bg-transparent py-2 text-sm text-foreground placeholder:text-slate-500 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 chat-input-textarea"
      />
      <button
        type="button"
        disabled={sending}
        onClick={handleAttachImageClick}
        className="flex h-9 w-9 items-center justify-center rounded-2xl border border-surface bg-surface-muted text-foreground hover:border-sky-400/80 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted"
      >
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Attach image</span>
      </button>
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
