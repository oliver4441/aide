"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
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

  if (!visible) return null;

  return (
    <div className="fixed left-1/2 z-[65] w-[94%] max-w-sm -translate-x-1/2 bottom-16 md:bottom-6 font-display">
      <div className="border border-rule p-4 bg-ground">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-rule bg-accent/20 text-accent">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-black text-ink">Get notified in-app</p>
            <p className="mt-0.5 text-xs text-secondary">
              Aide can alert you about low stock, new sales, and sync updates right inside the app — no internet push needed.
            </p>
          </div>
          <button
            onClick={() => choose(false)}
            aria-label="Dismiss"
            className="text-secondary hover:text-ink"
          >
            ×
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => choose(true)}
            className="flex-1 border border-ink bg-ink text-ground font-black py-2.5 text-sm hover:bg-ground hover:text-accent"
          >
            Enable notifications
          </button>
          <button
            onClick={() => choose(false)}
            className="border border-rule px-4 text-sm font-black text-secondary hover:text-ink"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
