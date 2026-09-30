"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

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

    // Soft nudge for browsers without a native prompt (e.g. iOS Safari).
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
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed left-1/2 -translate-x-1/2 z-[60] w-[94%] max-w-sm bottom-16 md:bottom-6"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <img src="/logo.jpg" alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface">Install Aide</p>
                <p className="text-[11px] text-on-surface-variant leading-snug">
                  {showInstructions
                    ? "Android/Chrome: menu ⋮ → Add to Home screen. iOS Safari: Share → Add to Home Screen."
                    : "Works offline and lives right on your home screen."}
                </p>
              </div>
              <button
                onClick={dismiss}
                className="text-on-surface-variant/60 hover:text-on-surface p-1.5 shrink-0 rounded-lg hover:bg-surface-container transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {!showInstructions && (
              <div className="px-4 pb-4">
                <button
                  onClick={install}
                  className="w-full bg-primary text-on-primary text-sm font-semibold py-2.5 rounded-xl hover:bg-primary-light transition-colors active:scale-[0.99]"
                >
                  Install
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
