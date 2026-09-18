"use client";
import { useMemo } from "react";
import db from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

interface DashboardData {
  todaySalesCount: number;
  todayRevenue: number;
  todayProfit: number;
  todayCost: number;
  lowStockProducts: number;
  totalProducts: number;
  recentSales: any[];
  loading: boolean;
}

function getStartOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useDashboard(businessId?: string): DashboardData {
  const today = getStartOfDay();

  const todaySales = useLiveQuery(
    () => businessId
      ? db.sales.where('businessId').equals(businessId).and((s) => s.createdAt >= today).toArray()
      : db.sales.where('createdAt').aboveOrEqual(today).toArray(),
    [businessId, today],
    []
  );

  const products = useLiveQuery(
    () => businessId
      ? db.products.where('businessId').equals(businessId).toArray()
      : db.products.toArray(),
    [businessId],
    []
  );

  // ⚡ Bolt Optimization: Memoize metrics computation and collapse multiple array
  // traversals into a single pass to eliminate redundant computations and object
  // allocations on component re-renders when underlying IndexedDB data hasn't changed.
  return useMemo(() => {
    const loading = todaySales === undefined || products === undefined;

    let activeCount = 0;
    let lowStockCount = 0;
    if (products) {
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        if (!p.deletedAt) {
          activeCount++;
          if (!p.isService && p.quantity <= p.lowStock) {
            lowStockCount++;
          }
        }
      }
    }

    let todayRevenue = 0;
    let todayProfit = 0;
    let todayCost = 0;
    const salesList = todaySales || [];

    for (let i = 0; i < salesList.length; i++) {
      const s = salesList[i];
      todayRevenue += s.total || 0;
      todayProfit += s.profit || 0;
      todayCost += s.cost || 0;
    }

    return {
      todaySalesCount: salesList.length,
      todayRevenue,
      todayProfit,
      todayCost,
      lowStockProducts: lowStockCount,
      totalProducts: activeCount,
      recentSales: salesList.slice(-10).reverse(),
      loading,
    };
  }, [todaySales, products]);
}
