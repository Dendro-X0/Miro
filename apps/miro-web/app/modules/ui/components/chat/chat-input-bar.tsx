"use client";

import type { ChangeEvent, FormEvent, KeyboardEvent, MutableRefObject, ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowUpCircle, Image as ImageIcon, Loader2, Mic, Paperclip } from "lucide-react";
import type { ChatInputBarProps } from "../../../../shell/types";
import { miroApi } from "../../../../lib/miro-api";

type VoicePhase = "idle" | "recording" | "stopping" | "transcribing";

const maxTextareaHeightPx: number = 160;
const maxRecordingMs: number = 60_000;
const stopFinalizeMs: number = 900;

function autoResizeTextarea(element: HTMLTextAreaElement): void {
  const elementRef: HTMLTextAreaElement = element;
  elementRef.style.height = "0px";
  const nextHeight: number = Math.min(elementRef.scrollHeight, maxTextareaHeightPx);
  elementRef.style.height = `${nextHeight}px`;
}

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return undefined;
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("mp4")) {
    return "m4a";
  }
  if (mimeType.includes("ogg")) {
    return "ogg";
  }
  return "webm";
}

/** Use the user's selected provider — voice works when that API supports Whisper STT. */
function resolveTranscriptionProvider(providerId: string | undefined): string {
  const id = (providerId ?? "").trim().toLowerCase();
  return id.length > 0 ? id : "openai-compatible";
}

function providerSupportsVoiceInput(providerId: string | undefined): boolean {
  const id = (providerId ?? "").trim().toLowerCase();
  // OpenAI Whisper / OpenAI-compatible /audio/transcriptions (and Local when Whisper is served).
  return id === "openai" || id === "openai-compatible" || id === "local";
}

export default function ChatInputBar(props: ChatInputBarProps): ReactElement {
  const {
    onSend,
    onGenerateImage,
    onAttachImage,
    sending,
    onFocus,
    placeholder,
    voiceProviderId,
    voiceByokKey,
    voiceBaseUrl,
    composeSeed,
    composeSeedKey,
  } = props;
  const [value, setValue] = useState<string>("");
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [voiceSupported, setVoiceSupported] = useState<boolean>(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const fileInputRef: MutableRefObject<HTMLInputElement | null> = useRef(null);
  const textareaRef: MutableRefObject<HTMLTextAreaElement | null> = useRef(null);
  const mediaStreamRef: MutableRefObject<MediaStream | null> = useRef(null);
  const mediaRecorderRef: MutableRefObject<MediaRecorder | null> = useRef(null);
  const chunksRef: MutableRefObject<Blob[]> = useRef([]);
  const mimeTypeRef: MutableRefObject<string> = useRef("audio/webm");
  const maxTimerRef: MutableRefObject<number | null> = useRef(null);
  const finalizeTimerRef: MutableRefObject<number | null> = useRef(null);
  const finalizedRef: MutableRefObject<boolean> = useRef(false);
  const phaseRef: MutableRefObject<VoicePhase> = useRef("idle");

  function setVoicePhase(next: VoicePhase): void {
    phaseRef.current = next;
    setPhase(next);
  }

  useEffect((): void => {
    if (typeof window === "undefined") {
      setVoiceSupported(false);
      return;
    }
    const supported =
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined";
    setVoiceSupported(supported);
  }, []);

  useEffect((): void => {
    if (composeSeedKey === undefined || composeSeed === undefined) {
      return;
    }
    setValue(composeSeed);
    const textarea = textareaRef.current;
    if (textarea) {
      autoResizeTextarea(textarea);
      textarea.focus();
    }
  }, [composeSeed, composeSeedKey]);

  useEffect((): (() => void) => {
    return () => {
      if (maxTimerRef.current !== null) {
        window.clearTimeout(maxTimerRef.current);
      }
      if (finalizeTimerRef.current !== null) {
        window.clearTimeout(finalizeTimerRef.current);
      }
      try {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // ignore
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
    };
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
    setValue(event.target.value);
    autoResizeTextarea(event.target);
  }

  function handleFocus(): void {
    onFocus?.();
  }

  function resizeTextareaFromRef(): void {
    if (textareaRef.current) {
      autoResizeTextarea(textareaRef.current);
    }
  }

  function appendTranscript(transcript: string): void {
    const trimmedTranscript = transcript.trim();
    if (!trimmedTranscript) {
      return;
    }
    setValue((previous) => {
      const trimmedPrevious = previous.trim();
      if (!trimmedPrevious) {
        return trimmedTranscript;
      }
      return `${trimmedPrevious} ${trimmedTranscript}`;
    });
    queueMicrotask(resizeTextareaFromRef);
  }

  function clearTimers(): void {
    if (maxTimerRef.current !== null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (finalizeTimerRef.current !== null) {
      window.clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }
  }

  function releaseMedia(): void {
    try {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    } catch {
      // ignore
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  }

  async function transcribeBlob(blob: Blob, mimeType: string): Promise<void> {
    setVoicePhase("transcribing");
    setVoiceError(null);
    try {
      const provider = resolveTranscriptionProvider(voiceProviderId);
      const result = await miroApi.transcribeAudio({
        file: blob,
        filename: `recording.${extensionForMime(mimeType)}`,
        provider,
        byokKey: voiceByokKey?.trim() || undefined,
        baseUrl: voiceBaseUrl?.trim() || undefined,
      });
      appendTranscript(result.text);
      setVoicePhase("idle");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not convert speech to text.";
      setVoiceError(message);
      setVoicePhase("idle");
    }
  }

  function finalizeRecording(): void {
    if (finalizedRef.current) {
      return;
    }
    finalizedRef.current = true;
    clearTimers();

    const mimeType = mimeTypeRef.current || "audio/webm";
    const chunks = chunksRef.current.slice();
    chunksRef.current = [];
    releaseMedia();

    const blob = new Blob(chunks, { type: mimeType });
    if (blob.size < 256) {
      setVoiceError("No audio captured. Check Windows microphone permissions for Miro Desktop.");
      setVoicePhase("idle");
      return;
    }
    void transcribeBlob(blob, mimeType);
  }

  async function startVoiceInput(): Promise<void> {
    if (!voiceSupported || sending || phaseRef.current !== "idle") {
      return;
    }
    setVoiceError(null);

    if (!providerSupportsVoiceInput(voiceProviderId)) {
      setVoiceError(
        "Voice input uses your selected provider’s speech API. Connect OpenAI, Custom, or Local (with Whisper) in Settings → AI & keys.",
      );
      return;
    }
    if (
      resolveTranscriptionProvider(voiceProviderId) !== "local" &&
      !(voiceByokKey ?? "").trim()
    ) {
      setVoiceError("Add an API key for the selected provider in Settings → AI & keys.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      mediaStreamRef.current = stream;
      chunksRef.current = [];
      finalizedRef.current = false;

      const mimeType = pickRecorderMimeType();
      mimeTypeRef.current = mimeType ?? "audio/webm";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event: Event): void => {
        const blobEvent = event as BlobEvent;
        if (blobEvent.data && blobEvent.data.size > 0) {
          chunksRef.current.push(blobEvent.data);
        }
      });

      recorder.addEventListener("error", (): void => {
        setVoiceError("Microphone recording failed.");
        finalizedRef.current = true;
        clearTimers();
        releaseMedia();
        chunksRef.current = [];
        setVoicePhase("idle");
      });

      // WebView2 sometimes never fires `stop` — finalize from either path.
      recorder.addEventListener("stop", (): void => {
        finalizeRecording();
      });

      // Prefer continuous chunks; timeslice helps WebView flush audio.
      try {
        recorder.start(200);
      } catch {
        recorder.start();
      }

      setVoicePhase("recording");
      maxTimerRef.current = window.setTimeout(() => {
        if (phaseRef.current === "recording") {
          stopVoiceInput();
        }
      }, maxRecordingMs);
    } catch {
      releaseMedia();
      chunksRef.current = [];
      setVoicePhase("idle");
      setVoiceError(
        "Microphone permission denied. Enable mic access for Miro Desktop in Windows Settings → Privacy → Microphone.",
      );
    }
  }

  function stopVoiceInput(): void {
    if (phaseRef.current !== "recording" && phaseRef.current !== "stopping") {
      return;
    }
    setVoicePhase("stopping");
    clearTimers();

    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      finalizeRecording();
      return;
    }

    try {
      if (recorder.state === "recording") {
        // Flush the current buffer before stop (important on WebView2).
        try {
          recorder.requestData();
        } catch {
          // unsupported
        }
        recorder.stop();
      } else if (recorder.state === "inactive") {
        finalizeRecording();
        return;
      }
    } catch {
      finalizeRecording();
      return;
    }

    // If `stop` event never arrives (common in embedded WebViews), force finalize.
    finalizeTimerRef.current = window.setTimeout(() => {
      finalizeRecording();
    }, stopFinalizeMs);
  }

  function handleVoiceButtonClick(): void {
    if (phaseRef.current === "transcribing" || phaseRef.current === "stopping") {
      return;
    }
    if (phaseRef.current === "recording") {
      stopVoiceInput();
      return;
    }
    void startVoiceInput();
  }

  function sendCurrentValue(): void {
    const trimmed = value.trim();
    if (!trimmed || sending || phaseRef.current === "transcribing") {
      return;
    }
    if (phaseRef.current === "recording") {
      stopVoiceInput();
    }
    onSend(trimmed);
    setValue("");
    queueMicrotask(resizeTextareaFromRef);
  }

  function handleGenerateImageClick(): void {
    const trimmed = value.trim();
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
    const input = fileInputRef.current;
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
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) {
      return;
    }
    const file = fileList[0];
    const reader = new FileReader();
    const prompt = value.trim();
    reader.onload = (): void => {
      const result: unknown = reader.result;
      if (typeof result !== "string") {
        return;
      }
      void onAttachImage({ dataUrl: result, prompt });
    };
    reader.readAsDataURL(file);
  }

  const recording = phase === "recording";
  const stopping = phase === "stopping";
  const transcribing = phase === "transcribing";
  const voiceBusy = recording || stopping || transcribing;
  const disableSend = sending || transcribing || value.trim().length === 0;
  const voiceButtonClassName = [
    "voice-mic-button flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-foreground disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted",
    voiceBusy
      ? "voice-mic-button-listening"
      : "border border-surface hover:border-sky-400/80 hover:text-sky-300",
  ].join(" ");

  return (
    <div className="space-y-1.5">
      <form
        onSubmit={handleSubmit}
        aria-label="Chat input"
        className={[
          "surface-panel bg-surface-muted flex items-center gap-3 rounded-2xl px-3 py-2 chat-input-safe transition-shadow duration-200",
          voiceBusy
            ? "shadow-[0_0_48px_rgba(56,189,248,0.4)] ring-1 ring-sky-400/40"
            : "shadow-[0_0_40px_rgba(56,189,248,0.25)]",
        ].join(" ")}
      >
        <p id="chat-input-help" className="sr-only">
          Press Enter to send. Press Shift and Enter for a new line. Tap the microphone to record,
          then tap again to stop and convert speech to text.
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
          disabled={
            sending ||
            (!voiceSupported && !onGenerateImage) ||
            stopping ||
            transcribing
          }
          onClick={voiceSupported ? handleVoiceButtonClick : handleGenerateImageClick}
          className={voiceButtonClassName}
          aria-pressed={recording}
          title={
            voiceError ??
            (transcribing
              ? "Converting speech to text…"
              : stopping
                ? "Stopping…"
                : recording
                  ? "Stop recording"
                  : "Record voice message")
          }
        >
          {voiceSupported ? (
            <span className="relative z-10 inline-flex items-center justify-center pointer-events-none">
              {transcribing || stopping ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : recording ? (
                <span className="voice-wave" aria-hidden="true">
                  <span className="voice-wave-bar" />
                  <span className="voice-wave-bar" />
                  <span className="voice-wave-bar" />
                  <span className="voice-wave-bar" />
                </span>
              ) : (
                <Mic className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="sr-only">
                {transcribing
                  ? "Converting speech to text"
                  : stopping
                    ? "Stopping recording"
                    : recording
                      ? "Stop recording"
                      : "Start recording"}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 pointer-events-none">
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Generate image from prompt</span>
            </span>
          )}
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          rows={1}
          placeholder={
            transcribing
              ? "Converting speech to text…"
              : stopping
                ? "Stopping…"
                : recording
                  ? "Recording… tap mic again to stop"
                  : (placeholder ?? "Ask Miro about your workspace...")
          }
          aria-label="Chat message"
          aria-describedby="chat-input-help"
          className="max-h-32 flex-1 resize-none overflow-y-auto bg-transparent py-2 text-sm text-foreground placeholder:text-slate-500 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 chat-input-textarea"
        />
        <button
          type="button"
          disabled={!onAttachImage || sending || voiceBusy}
          onClick={handleAttachImageClick}
          className={`flex h-9 w-9 items-center justify-center rounded-2xl border border-surface bg-surface-muted text-foreground hover:border-sky-400/80 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted ${
            onAttachImage ? "" : "hidden"
          }`}
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
      {recording ? (
        <p className="px-1 text-[11px] text-sky-300/90" role="status" aria-live="polite">
          Recording — tap the mic again to stop and convert to text
        </p>
      ) : stopping ? (
        <p className="px-1 text-[11px] text-sky-300/90" role="status" aria-live="polite">
          Stopping recording…
        </p>
      ) : transcribing ? (
        <p className="px-1 text-[11px] text-sky-300/90" role="status" aria-live="polite">
          Converting speech to text (Whisper)…
        </p>
      ) : voiceError ? (
        <p className="px-1 text-[11px] text-amber-300/90" role="status" aria-live="polite">
          {voiceError}
        </p>
      ) : null}
    </div>
  );
}
