"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, X } from "lucide-react";
import { setNotificationsEnabled } from "@/lib/notifications";

const PROMPT_KEY = "aide_notif_prompted";

export default function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;
    if (localStorage.getItem(PROMPT_KEY)) return;
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const choose = async (value: boolean) => {
    await setNotificationsEnabled(value);
    localStorage.setItem(PROMPT_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed left-1/2 z-[65] w-[94%] max-w-sm -translate-x-1/2 bottom-16 md:bottom-6"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-on-surface">Get notified in-app</p>
                <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
                  Aide can alert you about low stock, new sales, and sync updates right inside the app — no internet push needed.
                </p>
              </div>
              <button
                onClick={() => choose(false)}
                aria-label="Dismiss"
                className="text-on-surface-variant/60 hover:text-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => choose(true)}
                className="flex-1 rounded-xl bg-primary text-on-primary text-sm font-semibold py-2.5 hover:bg-primary-light transition-colors active:scale-[0.99]"
              >
                Enable notifications
              </button>
              <button
                onClick={() => choose(false)}
                className="rounded-xl border border-outline-variant px-4 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
