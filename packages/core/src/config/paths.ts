/** Same-origin paths used by miro-web (proxied via Next.js rewrites). */
export const miroApiPaths = {
  chat: "/api/chat",
  config: "/ai/config",
  models: "/ai/models",
  image: "/v2/ai/image",
} as const;
