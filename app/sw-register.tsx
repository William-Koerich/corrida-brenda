"use client";

import { useEffect } from "react";

/** Registra o service worker (só no build de produção; no dev atrapalharia o hot reload). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // sem service worker o app funciona, só não abre sem internet
    });
  }, []);

  return null;
}
