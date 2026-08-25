"use client";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (!standalone) setInstalled(false);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setInstalled(true);
      setVisible(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    // Show a soft nudge even without the native prompt on mobile
    if (!standalone && !localStorage.getItem("aide_install_dismissed")) {
      const t = setTimeout(() => setVisible(true), 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
        window.removeEventListener("appinstalled", installedHandler);
      };
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const install = async () => {
    if (deferred) {
      deferred.prompt();
      const res = await deferred.userChoice;
      if (res?.outcome === "accepted") setVisible(false);
      setDeferred(null);
    } else {
      alert(
        "To install: Android Chrome — menu (3 dots) > Add to Home screen.\nDesktop Chrome/Edge — install icon in the address bar.\niPhone Safari — Share > Add to Home Screen."
      );
    }
  };

  if (installed || !visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-sm">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
        <img src="/logo.jpg" alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-on-surface">Install Aide</p>
          <p className="text-[11px] text-on-surface-variant truncate">Works offline, on your home screen</p>
        </div>
        <button
          onClick={install}
          className="bg-primary text-on-primary text-xs font-semibold px-3 py-2 rounded-lg hover:bg-primary-light transition-colors shrink-0"
        >
          Install
        </button>
        <button
          onClick={() => {
            setVisible(false);
            localStorage.setItem("aide_install_dismissed", "1");
          }}
          className="text-on-surface-variant/60 hover:text-on-surface p-1 shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
