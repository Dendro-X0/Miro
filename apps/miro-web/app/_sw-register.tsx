"use client";

import type { ReactElement } from "react";
import { useEffect } from "react";

const serviceWorkerPath: string = "/sw.js";

/** Registers the PWA service worker once on the client. */
export default function ServiceWorkerRegister(): ReactElement {
  useEffect((): void => {
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
