export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  readonly id: string;
  readonly role: ChatRole;
  readonly content: string;
}

/** Payload shape for `POST /api/chat` (Vercel AI SDK UI messages). */
export interface ApiUiMessage {
  readonly role: "user" | "assistant" | "system";
  readonly parts?: readonly (
    | { readonly type: "text"; readonly text: string }
    | { readonly type: "image"; readonly image: string }
  )[];
  readonly content?: string;
}

export interface ApiChatRequest {
  readonly messages: readonly ApiUiMessage[];
  readonly model?: string;
  readonly provider?: string;
  readonly byokKey?: string;
  readonly baseUrl?: string;
  readonly systemPrompt?: string;
}
