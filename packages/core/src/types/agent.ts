export interface MemoryEntry {
  readonly id: string;
  readonly content: string;
  readonly createdAt: number;
}

export interface AgentSettings {
  /** Let the model call web search for current information. */
  readonly enableWebSearch: boolean;
  /** Inject saved memories into the system prompt. */
  readonly enableMemory: boolean;
  /** Locally stored facts/preferences about the user. */
  readonly memories: readonly MemoryEntry[];
}
