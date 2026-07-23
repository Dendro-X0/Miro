"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Minus, Square, X } from "lucide-react";
import { isTauriDesktop } from "../lib/tauri-desktop";

async function getAppWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

/**
 * Frameless desktop chrome. Uses Miro surface/border/foreground tokens so it
 * tracks light and dark themes with the rest of the shell.
 */
export default function DesktopTitlebar(): ReactElement | null {
  const [visible, setVisible] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isTauriDesktop()) {
      return;
    }
    setVisible(true);
    document.documentElement.classList.add("desktop-app");
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        const appWindow = await getAppWindow();
        setMaximized(await appWindow.isMaximized());
        unlisten = await appWindow.onResized(async () => {
          setMaximized(await appWindow.isMaximized());
        });
      } catch {
        // Titlebar still works without resize sync.
      }
    })();
    return () => {
      document.documentElement.classList.remove("desktop-app");
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const syncNativeTheme = (): void => {
      const isDark = document.documentElement.classList.contains("dark");
      void (async () => {
        try {
          const appWindow = await getAppWindow();
          await appWindow.setTheme(isDark ? "dark" : "light");
        } catch {
          // Older WebView builds may ignore setTheme.
        }
      })();
    };
    syncNativeTheme();
    const observer = new MutationObserver(syncNativeTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [visible]);

  const minimize = useCallback(() => {
    void getAppWindow().then((win) => win.minimize());
  }, []);

  const toggleMaximize = useCallback(() => {
    void getAppWindow().then(async (win) => {
      await win.toggleMaximize();
      setMaximized(await win.isMaximized());
    });
  }, []);

  const close = useCallback(() => {
    void getAppWindow().then((win) => win.close());
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <header
      className="desktop-titlebar sticky top-0 z-50 flex h-10 shrink-0 items-center border-b border-surface bg-surface/95 text-foreground backdrop-blur supports-[backdrop-filter]:bg-surface/80"
      data-tauri-drag-region
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3" data-tauri-drag-region>
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-[10px] font-bold tracking-wide text-sky-600 dark:text-sky-300"
          aria-hidden="true"
        >
          M
        </span>
        <span className="truncate text-xs font-semibold tracking-wide" data-tauri-drag-region>
          Miro
        </span>
        <span
          className="hidden truncate text-[10px] uppercase tracking-wider text-muted-foreground sm:inline"
          data-tauri-drag-region
        >
          Desktop
        </span>
      </div>
      <div className="flex h-full items-stretch">
        <button
          type="button"
          className="desktop-titlebar-btn"
          aria-label="Minimize"
          onClick={minimize}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="desktop-titlebar-btn"
          aria-label={maximized ? "Restore" : "Maximize"}
          onClick={toggleMaximize}
        >
          <Square className="h-3 w-3" aria-hidden="true" strokeWidth={2} />
        </button>
        <button
          type="button"
          className="desktop-titlebar-btn desktop-titlebar-btn-close"
          aria-label="Close"
          onClick={close}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
