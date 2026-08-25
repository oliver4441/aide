"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/lib/db";
import { syncEngine } from "@/lib/sync";
import { sounds } from "@/lib/sounds";

export default function SyncNowButton() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const pending = useLiveQuery(() => db.syncQueue.count(), [], 0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const sync = async () => {
    if (syncing || !online) return;
    setSyncing(true);
    try {
      await syncEngine.sync();
      sounds.sync();
    } catch {}
    setSyncing(false);
  };

  // Show only when online with pending local changes
  if (!online || !pending) return null;

  return (
    <button
      onClick={sync}
      disabled={syncing}
      className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-[60] flex items-center gap-2 bg-primary text-on-primary text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg shadow-primary/30 hover:bg-primary-light transition-colors disabled:opacity-70"
    >
      <svg className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      {syncing ? "Syncing..." : `Sync now (${pending})`}
    </button>
  );
}
