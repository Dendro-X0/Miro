import type { Context, Hono, Next } from "hono";

export interface AuthInfo {
  readonly authenticated: boolean;
  readonly userId?: string;
}

export interface AppVariables {
  readonly auth?: AuthInfo;
}

export type AppBindings = {
  readonly Bindings: Record<string, never>;
  readonly Variables: AppVariables;
};

export type AppInstance = Hono<AppBindings>;

export type AppContext = Context<AppBindings>;

export type AppNext = Next;
