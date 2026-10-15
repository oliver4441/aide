"use client";
import { useCallback } from "react";
import db, { BusinessRecord } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

export function useBusinessSettings() {
  const data = useLiveQuery(
    () => db.businesses.toArray(),
    [],
    [] as BusinessRecord[]
  );

  const loading = data === undefined;
  const activeId = typeof window !== 'undefined' ? localStorage.getItem('aide_business_id') : null;
  const business = data && data.length > 0
    ? (activeId ? data.find((b) => b.id === activeId) || data[0] : data[0])
    : null;

  const mutate = useCallback(async (updates: Partial<BusinessRecord>) => {
    if (!business) return;
    const updated = { ...business, ...updates };
    // Local-first so the UI updates instantly…
    await db.businesses.put(updated);
    // …then persist to the server, otherwise the next sync pull restores the
    // stale server copy and the change silently reverts (the reported bug).
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const result = await res.json().catch(() => null);
        if (result?.business) {
          // Adopt the server's canonical values (keeps local in step).
          await db.businesses.put({ ...updated, ...result.business });
        }
      }
    } catch {
      // Offline — the local change stands and can be re-saved later.
    }
  }, [business]);

  return { data: business, loading, mutate };
}
