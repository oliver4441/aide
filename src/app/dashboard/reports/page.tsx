"use client";

import { useSales } from "@/hooks/useSales";
import { formatMoney } from "@/lib/format";
import { useMemo } from "react";

export default function ReportsPage() {
  const { data: allSales, loading } = useSales();

  const reportData = useMemo(() => {
    const sales = allSales ?? [];
    if (sales.length === 0 && !loading) return null;

    const totalSales = sales.reduce((s, sale) => s + sale.total, 0);
    const totalProfit = sales.reduce((s, sale) => s + sale.profit, 0);
    const totalTransactions = sales.length;
    const avgSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    const dayMap: Record<string, { total: number; profit: number; count: number }> = {};
    sales.forEach((sale) => {
      const day = new Date(sale.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
      if (!dayMap[day]) dayMap[day] = { total: 0, profit: 0, count: 0 };
      dayMap[day].total += sale.total;
      dayMap[day].profit += sale.profit;
      dayMap[day].count += 1;
    });
    const salesByDay = Object.entries(dayMap)
      .map(([date, d]) => ({ date, ...d }))
      .reverse();

    const prodMap: Record<string, { quantity: number; revenue: number }> = {};
    sales.forEach((sale) => {
      const items = (sale as any).items || [];
      items.forEach((item: any) => {
        if (!prodMap[item.name]) prodMap[item.name] = { quantity: 0, revenue: 0 };
        prodMap[item.name].quantity += item.quantity;
        prodMap[item.name].revenue += item.price * item.quantity;
      });
    });
    const topProducts = Object.entries(prodMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    return { totalSales, totalProfit, totalTransactions, avgSale, salesByDay, topProducts };
  }, [allSales, loading]);

  if (loading || !reportData) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-container rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-surface-container rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxBar = Math.max(...reportData.salesByDay.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface font-headline">Reports</h1>
        <p className="text-on-surface-variant text-sm mt-1">Sales analytics and insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Total Revenue</div>
          <div className="text-xl font-bold text-on-surface font-headline">{formatMoney(reportData.totalSales)}</div>
          <div className="text-xs text-on-surface-variant mt-1">All time</div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Total Profit</div>
          <div className="text-xl font-bold text-success font-headline">{formatMoney(reportData.totalProfit)}</div>
          <div className="text-xs text-on-surface-variant mt-1">{reportData.totalSales > 0 ? Math.round((reportData.totalProfit / reportData.totalSales) * 100) : 0}% margin</div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Transactions</div>
          <div className="text-xl font-bold text-on-surface font-headline">{reportData.totalTransactions}</div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Avg Sale</div>
          <div className="text-xl font-bold text-on-surface font-headline">{formatMoney(reportData.avgSale)}</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
        <h2 className="text-lg font-bold text-on-surface font-headline mb-4">Revenue by Day</h2>
        {reportData.salesByDay.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center py-8">No data yet</p>
        ) : (
          <div className="flex items-end gap-2 h-48">
            {reportData.salesByDay.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] text-on-surface-variant font-mono">{formatMoney(day.total)}</div>
                <div
                  className="w-full bg-primary/60 rounded-t-lg hover:bg-primary transition-colors"
                  style={{ height: `${(day.total / maxBar) * 140}px`, minHeight: "4px" }}
                />
                <div className="text-[10px] text-on-surface-variant">{day.date}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Products */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant">
          <h2 className="text-lg font-bold text-on-surface font-headline">Top Products</h2>
        </div>
        {reportData.topProducts.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant/60 text-sm">No product data yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">#</th>
                  <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Product</th>
                  <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-center">Qty Sold</th>
                  <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {reportData.topProducts.map((p, i) => (
                  <tr key={p.name} className="hover:bg-surface-container/30 transition-colors">
                    <td className="px-5 py-3 text-sm text-on-surface-variant font-mono">{i + 1}</td>
                    <td className="px-5 py-3 text-sm font-medium text-on-surface">{p.name}</td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant text-center">{p.quantity}</td>
                    <td className="px-5 py-3 text-sm font-bold text-on-surface text-right">{formatMoney(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
