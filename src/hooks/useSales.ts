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
    // ⚡ Bolt Optimization: Wrap sale and sale items writes in a single transaction
    // and use bulkPut for sale items instead of sequential individual writes.
    await db.transaction('rw', [db.sales, db.saleItems], async () => {
      await db.sales.put(record);
      if (items.length > 0) {
        await db.saleItems.bulkPut(items);
      }
    });
    await syncEngine.enqueue('sales', 'create', sale.id, { sale: record, items });
  }, []);

  return { data, loading, error: null, mutate };
}
