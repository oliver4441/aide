"use client";

import { useState, useEffect } from "react";
import db from "@/lib/db";
import { getSyncStatus, syncEngine } from "@/lib/sync";

export default function OfflineStatus() {
  const [state, setState] = useState<"online" | "offline" | "stale" | "syncing">("online");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function read() {
      const { isOnline, isSyncing } = getSyncStatus();
      if (!mounted) return;

      if (!isOnline) {
        const queued = await db.syncQueue.count();
        const stale = await db
          .syncQueue.where("status")
          .equals("pending")
          .and((item) => new Date(item.timestamp).getTime() < Date.now() - 60 * 60 * 1000)
          .count();

        setState(queued > 0 ? (stale > 0 ? "stale" : "offline") : "online");
        setPending(queued);
        return;
      }

      setPending(0);
      setState(isSyncing ? "syncing" : "online");
    }

    read();

    const unsubscribe = syncEngine.subscribe(() => {
      void read();
    });

    const handleOnline = () => {
      if (mounted) {
        setState("online");
        setPending(0);
      }
    };
    const handleOffline = () => {
      if (mounted) {
        setState("offline");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (state === "online") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs font-display text-secondary">
        <span className="w-2 h-2 border border-accent text-accent" />
        Online
      </div>
    );
  }

  if (state === "syncing") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs font-display text-secondary">
        <span className="w-2 h-2 border border-accent text-accent animate-pulse" />
        Syncing
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs font-display text-secondary">
      <span className="w-2 h-2 border border-danger text-danger" />
      {pending > 0 ? (
        <>
          Offline — {pending} pending change{pending === 1 ? "" : "s"}
          {state === "stale" && " (stale)"}
        </>
      ) : (
        "Offline — no changes to sync"
      )}
    </div>
  );
}