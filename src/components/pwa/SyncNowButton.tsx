"use client";

import { useEffect, useState } from "react";
import db from "@/lib/db";
import { syncEngine } from "@/lib/sync";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { sounds } from "@/lib/sounds";
import { addNotification, syncNotificationsWithServer } from "@/lib/notifications";

export default function SyncNowButton() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const status = useSyncStatus();

  const [pending, setPending] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      setPending(await db.syncQueue.count());
    };
    fetchPending();
    const t = setInterval(fetchPending, 2000);
    return () => clearInterval(t);
  }, []);

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
    const count = pending;
    try {
      await syncEngine.sync();
      await syncNotificationsWithServer();
      sounds.sync();
      await addNotification({
        type: "system",
        title: "Sync completed",
        message: `${count} record${count === 1 ? "" : "s"} synchronized`,
      });
    } catch {
      await addNotification({
        type: "system",
        title: "Sync failed",
        message: "Could not sync your changes to the cloud",
      });
    }
    setSyncing(false);
  };

  if (!online || !pending || status.isSyncing) return null;

  return (
    <button
      onClick={sync}
      disabled={syncing}
      className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-[60] flex items-center gap-2 border border-accent bg-accent text-ground font-display font-black px-4 py-2.5 text-xs hover:bg-ground hover:text-ink disabled:opacity-70"
    >
      {syncing ? (
        <span className="w-4 h-4 border border-current border-t-transparent np-spinner" />
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      )}
      {syncing ? "Syncing..." : `Sync now (${pending})`}
    </button>
  );
}
