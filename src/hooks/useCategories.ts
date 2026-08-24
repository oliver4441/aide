"use client";
import { useCallback } from "react";
import db, { CategoryRecord } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { syncEngine } from "@/lib/sync";

export function useCategories(businessId?: string) {
  const data = useLiveQuery(
    () => businessId
      ? db.categories.where('businessId').equals(businessId).toArray()
      : db.categories.toArray(),
    [businessId],
    [] as CategoryRecord[]
  ) || [];

  const loading = data === undefined;

  const mutate = useCallback(async (category: CategoryRecord) => {
    const record = {
      ...category,
      syncStatus: 'pending' as const,
    };
    await db.categories.put(record);
    await syncEngine.enqueue('categories', category.id ? 'update' : 'create', category.id, record);
  }, []);

  const remove = useCallback(async (id: string) => {
    await db.categories.update(id, { syncStatus: 'pending' as const, deletedAt: new Date().toISOString() });
    await syncEngine.enqueue('categories', 'delete', id, { id });
  }, []);

  return { data, loading, error: null, mutate, remove };
}
