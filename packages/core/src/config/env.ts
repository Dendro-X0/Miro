const defaultApiBaseUrl = "http://127.0.0.1:8787";

function readEnv(): Record<string, string | undefined> {
  const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return globalProcess?.env ?? {};
}

/** Resolve the Miro API base URL from Expo or web public env vars. */
export function resolveMiroApiBaseUrl(
  env: Record<string, string | undefined> = readEnv(),
): string {
  return env.EXPO_PUBLIC_MIRO_API_BASE_URL ?? env.NEXT_PUBLIC_MIRO_API_BASE_URL ?? defaultApiBaseUrl;
}
