"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "aide_install_dismissed";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (!isStandalone) setInstalled(false);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    if (!isStandalone && !localStorage.getItem(DISMISS_KEY)) {
      const t = setTimeout(() => setVisible(true), 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (deferred) {
      deferred.prompt();
      const res = await deferred.userChoice;
      if (res?.outcome === "accepted") {
        setVisible(false);
        setInstalled(true);
      }
      setDeferred(null);
    } else {
      setShowInstructions(true);
    }
  };

  if (installed || !visible) return null;

  return (
    <div className="fixed left-1/2 z-[60] w-[94%] max-w-sm -translate-x-1/2 bottom-16 md:bottom-6 font-display">
      <div className="border border-rule bg-ground p-4">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="" className="w-11 h-11 object-cover shrink-0 border border-rule" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-ink">Install Aide</p>
            <p className="font-reading text-[11px] text-secondary">
              {showInstructions
                ? "Android/Chrome: menu ⋮ → Add to Home screen. iOS Safari: Share → Add to Home Screen."
                : "Works offline and lives right on your home screen."}
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-secondary hover:text-ink p-1.5"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
        {!showInstructions && (
          <div className="pt-3">
            <button
              onClick={install}
              className="w-full border border-ink bg-ink text-ground font-black text-sm py-2.5 hover:bg-ground hover:text-accent"
            >
              Install
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
