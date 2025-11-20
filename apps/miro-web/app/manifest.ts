import type { MetadataRoute } from "next";

/** Web app manifest for the Miro AI Workspace PWA. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Miro AI Workspace",
    short_name: "Miro AI",
    description: "Generative workspace for chat and image AI in your Miro projects.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0ea5e9",
    icons: [
      {
        src: "/miro-icon.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
    ],
  };
}
