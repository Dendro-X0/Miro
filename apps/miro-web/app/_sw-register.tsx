"use client";

import type { ReactElement } from "react";
import { useEffect } from "react";

const serviceWorkerPath: string = "/sw.js";

/** Registers the PWA service worker once on the client. */
export default function ServiceWorkerRegister(): ReactElement {
  useEffect((): void => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }
    if (process.env.NEXT_PUBLIC_MIRO_DESKTOP === "1") {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (!("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.register(serviceWorkerPath).catch((): void => {
      return;
    });
  }, []);
  return <></>;
}
