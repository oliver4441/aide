"use client";
import { useCallback } from "react";
import db, { ProductRecord } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { syncEngine } from "@/lib/sync";

export function useProducts(businessId?: string) {
  const data = useLiveQuery(
    () => businessId
      ? db.products.where('businessId').equals(businessId).toArray()
      : db.products.toArray(),
    [businessId],
    [] as ProductRecord[]
  ) || [];

  const loading = data === undefined;

  const mutate = useCallback(async (product: ProductRecord) => {
    const record = {
      ...product,
      syncStatus: 'pending' as const,
      updatedAt: new Date().toISOString(),
    };
    await db.products.put(record);
    await syncEngine.enqueue('products', product.id ? 'update' : 'create', product.id, record);
  }, []);

  const remove = useCallback(async (id: string) => {
    await db.products.update(id, { syncStatus: 'pending' as const, deletedAt: new Date().toISOString() });
    await syncEngine.enqueue('products', 'delete', id, { id });
  }, []);

  return { data, loading, error: null, mutate, remove };
}
