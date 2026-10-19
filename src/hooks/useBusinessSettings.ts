"use client";
import { useCallback } from "react";
import db, { BusinessRecord } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useSyncStatus } from "@/hooks/useSyncStatus";

export function useBusinessSettings() {
  const data = useLiveQuery(
    () => db.businesses.toArray(),
    [],
    [] as BusinessRecord[]
  );

  const loading = data === undefined;
  const status = useSyncStatus();
  const activeId = typeof window !== 'undefined' ? localStorage.getItem('aide_business_id') : null;
  const business = data && data.length > 0
    ? (activeId ? data.find((b) => b.id === activeId) || data[0] : data[0])
    : null;

  const mutate = useCallback(async (updates: Partial<BusinessRecord>) => {
    if (!business) return;
    const updated = { ...business, ...updates };
    await db.businesses.put(updated);
  }, [business]);

  return { data: business, loading, status, mutate };
}
