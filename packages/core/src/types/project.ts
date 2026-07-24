export interface WorkspaceProject {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly defaultComfyCheckpoint?: string | null;
}

export interface ProjectsSettings {
  readonly items: readonly WorkspaceProject[];
  /** null = Inbox (unscoped) */
  readonly activeProjectId: string | null;
}
