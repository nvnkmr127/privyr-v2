"use client";

import { useEffect } from "react";

// Registers the service worker on load so the app is installable as a PWA (not only
// after the user enables push). sw.js handles push + notification clicks today; it has
// no fetch handler, so this makes the app installable, not yet offline-capable.
// ponytail: add a fetch/cache handler in sw.js when offline lead access is needed.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* registration is best-effort; push flow re-registers if needed */
    });
  }, []);
  return null;
}
