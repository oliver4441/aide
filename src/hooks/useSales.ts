"use client";
import { useCallback } from "react";
import db, { SaleRecord, SaleItemRecord } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { syncEngine } from "@/lib/sync";

export function useSales(businessId?: string) {
  const data = useLiveQuery(
    () => businessId
      ? db.sales.where('businessId').equals(businessId).reverse().sortBy('createdAt')
      : db.sales.orderBy('createdAt').reverse().toArray(),
    [businessId],
    [] as SaleRecord[]
  ) || [];

  const loading = data === undefined;

  const mutate = useCallback(async (sale: SaleRecord, items: SaleItemRecord[]) => {
    const record = {
      ...sale,
      syncStatus: 'pending' as const,
    };
    await db.sales.put(record);
    for (const item of items) {
      await db.saleItems.put(item);
    }
    await syncEngine.enqueue('sales', 'create', sale.id, { sale: record, items });
  }, []);

  return { data, loading, error: null, mutate };
}
