export interface UiShellSection {
  readonly id: string;
  readonly label: string;
}

export interface UiShellConfig {
  readonly sections: readonly UiShellSection[];
}

export interface ColorTokens {
  readonly background: string;
  readonly foreground: string;
  readonly muted: string;
  readonly primary: string;
  readonly primaryForeground: string;
  readonly destructive: string;
}

export interface SpaceTokens {
  readonly xs: string;
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
}

export interface RadiusTokens {
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly full: string;
}

export interface TypographyTokens {
  readonly fontSans: string;
  readonly fontMono: string;
  readonly textSm: string;
  readonly textBase: string;
  readonly textLg: string;
}

export interface UiTokens {
  readonly colors: ColorTokens;
  readonly space: SpaceTokens;
  readonly radius: RadiusTokens;
  readonly typography: TypographyTokens;
}

export const tokens: UiTokens = {
  colors: {
    background: "#0b0b0c",
    foreground: "#ffffff",
    muted: "#6b7280",
    primary: "#2563eb",
    primaryForeground: "#ffffff",
    destructive: "#ef4444",
  },
  space: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
  },
  radius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    full: "9999px",
  },
  typography: {
    fontSans:
      "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'",
    fontMono:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    textSm: "0.875rem",
    textBase: "1rem",
    textLg: "1.125rem",
  },
} as const;

export function createDefaultUiShellConfig(): UiShellConfig {
  const sections: readonly UiShellSection[] = [
    { id: "home", label: "Home" },
    { id: "workspaces", label: "Workspaces" },
    { id: "ai", label: "AI" },
  ];
  return { sections };
}
