"use client";
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

  const loading = todaySales === undefined || products === undefined;

  const activeProducts = (products || []).filter((p) => !p.deletedAt);
  const lowStock = activeProducts.filter((p) => p.quantity <= p.lowStock && !p.isService);

  return {
    todaySalesCount: (todaySales || []).length,
    todayRevenue: (todaySales || []).reduce((sum: number, s: any) => sum + s.total, 0),
    todayProfit: (todaySales || []).reduce((sum: number, s: any) => sum + s.profit, 0),
    todayCost: (todaySales || []).reduce((sum: number, s: any) => sum + s.cost, 0),
    lowStockProducts: lowStock.length,
    totalProducts: activeProducts.length,
    recentSales: (todaySales || []).slice(-10).reverse(),
    loading,
  };
}
