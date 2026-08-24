"use client";

import { useEffect, useState } from "react";

function formatKES(n: number) {
  return "KSh " + n.toLocaleString("en-KE");
}

interface ReportData {
  totalSales: number;
  totalProfit: number;
  totalTransactions: number;
  avgSale: number;
  salesByDay: { date: string; total: number; profit: number; count: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We'll aggregate from existing sales data
    fetch("/api/sales?limit=500")
      .then((r) => r.json())
      .then((res) => {
        const sales = res.sales;
        const totalSales = sales.reduce((s: number, sale: any) => s + sale.total, 0);
        const totalProfit = sales.reduce((s: number, sale: any) => s + sale.profit, 0);
        const totalTransactions = sales.length;
        const avgSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;

        // Group by day
        const dayMap: Record<string, { total: number; profit: number; count: number }> = {};
        sales.forEach((sale: any) => {
          const day = new Date(sale.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
          if (!dayMap[day]) dayMap[day] = { total: 0, profit: 0, count: 0 };
          dayMap[day].total += sale.total;
          dayMap[day].profit += sale.profit;
          dayMap[day].count += 1;
        });
        const salesByDay = Object.entries(dayMap)
          .map(([date, data]) => ({ date, ...data }))
          .reverse();

        // Top products
        const prodMap: Record<string, { quantity: number; revenue: number }> = {};
        sales.forEach((sale: any) => {
          sale.items.forEach((item: any) => {
            if (!prodMap[item.name]) prodMap[item.name] = { quantity: 0, revenue: 0 };
            prodMap[item.name].quantity += item.quantity;
            prodMap[item.name].revenue += item.price * item.quantity;
          });
        });
        const topProducts = Object.entries(prodMap)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 8);

        setData({ totalSales, totalProfit, totalTransactions, avgSale, salesByDay, topProducts });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-dark-surface rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-dark-surface rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxBar = Math.max(...data.salesByDay.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-headline)]">Reports</h1>
        <p className="text-zinc-400 text-sm mt-1">Sales analytics and insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-surface border border-dark-border rounded-xl p-5">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Total Revenue</div>
          <div className="text-xl font-bold text-white font-[family-name:var(--font-headline)]">{formatKES(data.totalSales)}</div>
          <div className="text-xs text-zinc-500 mt-1">All time</div>
        </div>
        <div className="bg-dark-surface border border-dark-border rounded-xl p-5">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Total Profit</div>
          <div className="text-xl font-bold text-emerald-400 font-[family-name:var(--font-headline)]">{formatKES(data.totalProfit)}</div>
          <div className="text-xs text-zinc-500 mt-1">{data.totalSales > 0 ? Math.round((data.totalProfit / data.totalSales) * 100) : 0}% margin</div>
        </div>
        <div className="bg-dark-surface border border-dark-border rounded-xl p-5">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Transactions</div>
          <div className="text-xl font-bold text-white font-[family-name:var(--font-headline)]">{data.totalTransactions}</div>
        </div>
        <div className="bg-dark-surface border border-dark-border rounded-xl p-5">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Avg Sale</div>
          <div className="text-xl font-bold text-white font-[family-name:var(--font-headline)]">{formatKES(data.avgSale)}</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-dark-surface border border-dark-border rounded-xl p-5">
        <h2 className="text-lg font-bold text-white font-[family-name:var(--font-headline)] mb-4">Revenue by Day</h2>
        <div className="flex items-end gap-2 h-48">
          {data.salesByDay.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[10px] text-zinc-500 font-mono">{formatKES(day.total)}</div>
              <div
                className="w-full bg-primary/60 rounded-t-lg hover:bg-primary transition-colors"
                style={{ height: `${(day.total / maxBar) * 140}px`, minHeight: "4px" }}
              />
              <div className="text-[10px] text-zinc-500">{day.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-border">
          <h2 className="text-lg font-bold text-white font-[family-name:var(--font-headline)]">Top Products</h2>
        </div>
        {data.topProducts.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 text-sm">No product data yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">#</th>
                  <th className="px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Product</th>
                  <th className="px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-center">Qty Sold</th>
                  <th className="px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {data.topProducts.map((p, i) => (
                  <tr key={p.name} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3 text-sm text-zinc-500 font-mono">{i + 1}</td>
                    <td className="px-5 py-3 text-sm font-medium text-zinc-200">{p.name}</td>
                    <td className="px-5 py-3 text-sm text-zinc-400 text-center">{p.quantity}</td>
                    <td className="px-5 py-3 text-sm font-bold text-white text-right">{formatKES(p.revenue)}</td>
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
