const isDesktopBuild = process.env.MIRO_DESKTOP_BUILD === "1";
const apiBaseUrl = process.env.NEXT_PUBLIC_MIRO_API_BASE_URL ?? "http://127.0.0.1:8787";

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ["@miro/core"],
  ...(isDesktopBuild
    ? {
        output: "export",
        images: { unoptimized: true },
        trailingSlash: true,
        env: {
          NEXT_PUBLIC_MIRO_DESKTOP: "1",
          NEXT_PUBLIC_MIRO_API_BASE_URL: apiBaseUrl,
        },
      }
    : {
        async rewrites() {
          return [
            { source: "/api/chat", destination: `${apiBaseUrl}/api/chat` },
            { source: "/ai/config", destination: `${apiBaseUrl}/ai/config` },
            { source: "/ai/models", destination: `${apiBaseUrl}/ai/models` },
            { source: "/ai/transcribe", destination: `${apiBaseUrl}/ai/transcribe` },
            { source: "/v2/ai/:path*", destination: `${apiBaseUrl}/v2/ai/:path*` },
          ];
        },
      }),
};

export default config;
