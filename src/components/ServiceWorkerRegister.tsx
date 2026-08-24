"use client";
import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "activated" && navigator.serviceWorker.controller) {
                  console.log("New service worker activated");
                }
              });
            }
          });
        })
        .catch((err) => console.error("SW registration failed:", err));
    }
  }, []);

  return null;
}
