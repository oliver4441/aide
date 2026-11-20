"use client";

import { useState, useEffect } from "react";
import db from "@/lib/db";
import { getSyncStatus, syncEngine } from "@/lib/sync";

/**
 * Offline indicator for the offline-first app shell.
 *
 * Distinguishes three states instead of collapsing everything to "online/offline":
 *
 *  - `online`            — connection back, queue empty or currently syncing.
 *  - `offline`           — no network, but there are pending changes that will
 *                          sync when the connection returns.
 *  - `stale`             — no network AND the outbox still has untouched rows
 *                          older than `SYNC_RETRY_THRESHOLD_MS`.
 *  - `syncing`           — connected and the engine is draining the outbox.
 *
 * Stuck queue items should also be quarantined by the backfill runner so they
 * don't sit forever in `pending` and get silently ignored.
 */
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
          .syncQueue.where('status')
          .equals('pending')
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

    // The engine fires its listeners on every queue/connectivity change, so the
    // badge follows the outbox instead of freezing at whatever mount saw.
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
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-on-surface-variant">
        <span className="w-2 h-2 rounded-full bg-success" />
        Online
      </div>
    );
  }

  if (state === "syncing") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-on-surface-variant">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        Syncing
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-on-surface-variant">
      <span className="w-2 h-2 rounded-full bg-danger" />
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
