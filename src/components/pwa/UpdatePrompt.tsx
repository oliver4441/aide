"use client";

import { useEffect, useState } from "react";

export default function UpdatePrompt() {
  const [ready, setReady] = useState<any>(null);

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.waiting) setReady(detail.waiting);
    };
    window.addEventListener("aide-sw-update", onUpdate);
    return () => window.removeEventListener("aide-sw-update", onUpdate);
  }, []);

  const refresh = () => {
    ready?.postMessage({ type: "SKIP_WAITING" });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    }, { once: true });
    // Fallback reload
    setTimeout(() => window.location.reload(), 1500);
  };

  if (!ready) return null;

  return (
    <button
      onClick={refresh}
      className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-[60] flex items-center gap-2 bg-surface-container-lowest border border-primary/30 text-primary text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg hover:bg-primary/10 transition-colors"
    >
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Update Aide
    </button>
  );
}
