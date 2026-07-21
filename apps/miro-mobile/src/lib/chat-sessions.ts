import AsyncStorage from "@react-native-async-storage/async-storage";

const STORE_KEY = "miro-mobile-chats-v1";

export interface MobileChatSession {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: number;
}

export interface MobileChatMessage {
  readonly id: string;
  readonly sessionId: string;
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly createdAt: number;
}

interface ChatStore {
  readonly sessions: readonly MobileChatSession[];
  readonly messages: readonly MobileChatMessage[];
}

function emptyStore(): ChatStore {
  return { sessions: [], messages: [] };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readStore(): Promise<ChatStore> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) {
      return emptyStore();
    }
    const parsed = JSON.parse(raw) as ChatStore;
    if (!Array.isArray(parsed.sessions) || !Array.isArray(parsed.messages)) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: ChatStore): Promise<void> {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export async function listSessions(): Promise<readonly MobileChatSession[]> {
  const store = await readStore();
  return [...store.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createSession(title = "New chat"): Promise<MobileChatSession> {
  const store = await readStore();
  const session: MobileChatSession = {
    id: createId("session"),
    title,
    updatedAt: Date.now(),
  };
  await writeStore({
    sessions: [session, ...store.sessions],
    messages: store.messages,
  });
  return session;
}

export async function renameSession(sessionId: string, title: string): Promise<void> {
  const store = await readStore();
  await writeStore({
    sessions: store.sessions.map((session) =>
      session.id === sessionId ? { ...session, title, updatedAt: Date.now() } : session,
    ),
    messages: store.messages,
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  const store = await readStore();
  await writeStore({
    sessions: store.sessions.filter((session) => session.id !== sessionId),
    messages: store.messages.filter((message) => message.sessionId !== sessionId),
  });
}

export async function loadMessages(sessionId: string): Promise<readonly MobileChatMessage[]> {
  const store = await readStore();
  return store.messages
    .filter((message) => message.sessionId === sessionId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
): Promise<MobileChatMessage> {
  const store = await readStore();
  const message: MobileChatMessage = {
    id: createId(role),
    sessionId,
    role,
    content,
    createdAt: Date.now(),
  };
  const titleFromUser =
    role === "user" && content.trim()
      ? content.trim().slice(0, 48)
      : null;
  await writeStore({
    sessions: store.sessions.map((session) => {
      if (session.id !== sessionId) {
        return session;
      }
      const nextTitle =
        session.title === "New chat" && titleFromUser ? titleFromUser : session.title;
      return { ...session, title: nextTitle, updatedAt: Date.now() };
    }),
    messages: [...store.messages, message],
  });
  return message;
}

export { createId };
