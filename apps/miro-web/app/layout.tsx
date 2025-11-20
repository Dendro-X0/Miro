import type { ReactElement, ReactNode } from "react";
import "./globals.css";
import ServiceWorkerRegister from "./_sw-register";

interface RootLayoutProps {
  readonly children: ReactNode;
}

/** Root layout for the Miro web application shell. */
export default function RootLayout(props: RootLayoutProps): ReactElement {
  const { children } = props;
  return (
    <html lang="en">
      <head>
        <title>Miro AI Workspace</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Miro is a PWA-first AI workspace for chat, image generation, and collaborative work."
        />
        <link rel="icon" href="/miro-icon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0ea5e9" />
      </head>
      <body className="min-h-screen antialiased safe-area-shell">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
