"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const announce = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && navigator.serviceWorker.controller) {
        window.dispatchEvent(
          new CustomEvent("aide-sw-update", { detail: { waiting: reg.waiting } })
        );
      }
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Already waiting?
        announce(reg);
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed") announce(reg);
          });
        });
      })
      .catch(() => {});

    // Check for updates when user returns to the tab or comes back online
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker.ready.then((reg) => {
          reg.update().then(() => announce(reg)).catch(() => {});
        }).catch(() => {});
      }
    };
    const onOnline = () => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.update().then(() => announce(reg)).catch(() => {});
      }).catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
