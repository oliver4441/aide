"use client";
import { useMemo, useState } from "react";
import db from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useSyncStatus } from "@/hooks/useSyncStatus";

export type DashboardPeriod = "today" | "7days" | "30days" | "month" | "all";

export interface TrendPoint {
  label: string;
  revenue: number;
  profit: number;
}

export interface PaymentMethodPoint {
  method: string;
  count: number;
  total: number;
}

export interface DashboardData {
  period: DashboardPeriod;
  setPeriod: (period: DashboardPeriod) => void;
  todaySalesCount: number;
  todayRevenue: number;
  todayProfit: number;
  todayCost: number;
  lowStockProducts: number;
  totalProducts: number;
  recentSales: any[];
  trendData: TrendPoint[];
  paymentBreakdown: PaymentMethodPoint[];
  loading: boolean;
  syncStatus: "online" | "offline";
  syncError: string | null;
}

function getCutoffDate(period: DashboardPeriod): string {
  const d = new Date();
  if (period === "today") {
    d.setHours(0, 0, 0, 0);
  } else if (period === "7days") {
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
  } else if (period === "30days") {
    d.setDate(d.getDate() - 29);
    d.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  } else {
    return "1970-01-01T00:00:00.000Z";
  }
  return d.toISOString();
}

export function useDashboard(businessId?: string): DashboardData {
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const cutoff = useMemo(() => getCutoffDate(period), [period]);

  const sales = useLiveQuery(
    () => businessId
      ? db.sales.where('businessId').equals(businessId).and((s) => s.createdAt >= cutoff).toArray()
      : db.sales.where('createdAt').aboveOrEqual(cutoff).toArray(),
    [businessId, cutoff],
    []
  );

  const products = useLiveQuery(
    () => businessId
      ? db.products.where('businessId').equals(businessId).toArray()
      : db.products.toArray(),
    [businessId],
    []
  );

  const status = useSyncStatus();

  return useMemo(() => {
    const loading = sales === undefined || products === undefined;

    let activeCount = 0;
    let lowStockCount = 0;
    if (products) {
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        if (!p.deletedAt) {
          activeCount++;
          if (!p.isService && p.quantity <= (p.lowStock ?? 5)) {
            lowStockCount++;
          }
        }
      }
    }

    let todayRevenue = 0;
    let todayProfit = 0;
    let todayCost = 0;
    const salesList = sales || [];

    const paymentMap: Record<string, { count: number; total: number }> = {};

    for (let i = 0; i < salesList.length; i++) {
      const s = salesList[i];
      const rev = s.total || 0;
      const prof = s.profit || 0;
      const cost = s.cost || 0;

      todayRevenue += rev;
      todayProfit += prof;
      todayCost += cost;

      const method = (s.paymentMethod || "CASH").toUpperCase();
      if (!paymentMap[method]) {
        paymentMap[method] = { count: 0, total: 0 };
      }
      paymentMap[method].count += 1;
      paymentMap[method].total += rev;
    }

    // Build trend chart points (7 days or days in period)
    const trendData = buildTrendPoints(salesList, period);

    const paymentBreakdown: PaymentMethodPoint[] = Object.entries(paymentMap).map(
      ([method, data]) => ({
        method,
        count: data.count,
        total: data.total,
      })
    );

    return {
      period,
      setPeriod,
      todaySalesCount: salesList.length,
      todayRevenue,
      todayProfit,
      todayCost,
      lowStockProducts: lowStockCount,
      totalProducts: activeCount,
      recentSales: [...salesList].reverse().slice(0, 10),
      trendData,
      paymentBreakdown,
      loading,
      syncStatus: status.isOnline ? 'online' : 'offline',
      syncError: null,
    };
  }, [sales, products, status.isOnline, period]);
}

function buildTrendPoints(salesList: any[], period: DashboardPeriod): TrendPoint[] {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const points: Record<string, { revenue: number; profit: number }> = {};

  const numDays = period === "today" ? 7 : period === "7days" ? 7 : 14;
  const now = new Date();

  const labels: string[] = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const label = `${dayNames[d.getDay()]} ${d.getDate()}`;
    labels.push(key);
    points[key] = { revenue: 0, profit: 0 };
  }

  salesList.forEach((s) => {
    if (s.createdAt) {
      const key = s.createdAt.split("T")[0];
      if (points[key]) {
        points[key].revenue += s.total || 0;
        points[key].profit += s.profit || 0;
      }
    }
  });

  return labels.map((key) => {
    const d = new Date(key);
    const label = `${dayNames[d.getDay()]} ${d.getDate()}`;
    return {
      label,
      revenue: points[key]?.revenue || 0,
      profit: points[key]?.profit || 0,
    };
  });
}
