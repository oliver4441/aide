"use client";

import { useEffect, useState } from "react";
import { getSyncStatus, syncEngine } from "@/lib/sync";

export type SyncStatus = {
  isOnline: boolean;
  isSyncing: boolean;
  pending: number;
};

/**
 * `getSyncStatus()` is a synchronous read of engine state, so a component that
 * only calls it during render keeps the value it first saw. Subscribing to the
 * engine makes the connectivity / syncing / pending badges live.
 */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(() => getSyncStatus());

  useEffect(() => {
    setStatus(getSyncStatus());
    return syncEngine.subscribe(() => setStatus(getSyncStatus()));
  }, []);

  return status;
}
