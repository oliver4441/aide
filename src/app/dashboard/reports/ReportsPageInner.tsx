"use client";

import { useSales } from "@/hooks/useSales";
import { useDashboard } from "@/hooks/useDashboard";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { formatMoney, formatDate } from "@/lib/format";
import { useMemo, useState } from "react";
import { printReport } from "@/components/reports/ReportPrint";
import QRCode from "@/components/reports/QRCode";

function exportCSV(sales: any[]) {
  const headers = ["Date", "Time", "Total", "Cost", "Profit", "Payment Method", "Items", "Cashier"];
  const rows = sales.map((s) => [
    new Date(s.createdAt).toLocaleDateString("en-KE"),
    new Date(s.createdAt).toLocaleTimeString("en-KE"),
    String(s.total),
    String(s.cost),
    String(s.profit),
    s.paymentMethod,
    String(s.items?.length || 0),
    s.cashier || "—",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aide-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function getStartOfPeriod(period: string): Date {
  const now = new Date();
  switch (period) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return d;
    }
    default:
      return new Date(0);
  }
}

export default function ReportsPage() {
  const { data: allSales, loading } = useSales();
  const { todayRevenue, todayProfit, todayCost, todaySalesCount } = useDashboard();
  const { data: business } = useBusinessSettings();
  const [showQR, setShowQR] = useState(false);

  const reportData = useMemo(() => {
    const sales = allSales ?? [];

    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    const totalCost = sales.reduce((s, sale) => s + sale.cost, 0);
    const totalProfit = sales.reduce((s, sale) => s + sale.profit, 0);
    const totalTransactions = sales.length;
    const avgSale = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Week stats
    const weekStart = getStartOfPeriod("week");
    const weekSales = sales.filter((s) => new Date(s.createdAt) >= weekStart);
    const weekRevenue = weekSales.reduce((s, sale) => s + sale.total, 0);
    const weekCost = weekSales.reduce((s, sale) => s + sale.cost, 0);
    const weekProfit = weekSales.reduce((s, sale) => s + sale.profit, 0);

    // Month stats
    const monthStart = getStartOfPeriod("month");
    const monthSales = sales.filter((s) => new Date(s.createdAt) >= monthStart);
    const monthRevenue = monthSales.reduce((s, sale) => s + sale.total, 0);
    const monthCost = monthSales.reduce((s, sale) => s + sale.cost, 0);
    const monthProfit = monthSales.reduce((s, sale) => s + sale.profit, 0);

    // Last 7 days chart data
    const last7Days: { date: string; label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const dayTotal = sales
        .filter((s) => {
          const sd = new Date(s.createdAt);
          return sd >= d && sd < nextD;
        })
        .reduce((sum, s) => sum + s.total, 0);
      last7Days.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en-KE", { weekday: "short" }),
        total: dayTotal,
      });
    }

    // Top products
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
      .slice(0, 5);

    // Payment breakdown
    const payMap: Record<string, { count: number; total: number }> = {};
    sales.forEach((sale) => {
      if (!payMap[sale.paymentMethod]) payMap[sale.paymentMethod] = { count: 0, total: 0 };
      payMap[sale.paymentMethod].count += 1;
      payMap[sale.paymentMethod].total += sale.total;
    });
    const paymentBreakdown = Object.entries(payMap)
      .map(([method, d]) => ({ method, ...d }))
      .sort((a, b) => b.total - a.total);

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalTransactions,
      avgSale,
      weekRevenue,
      weekCost,
      weekProfit,
      monthRevenue,
      monthCost,
      monthProfit,
      last7Days,
      topProducts,
      paymentBreakdown,
      sales,
    };
  }, [allSales]);

  const handlePrint = () => {
    const bName = business?.name || "Aide Business";
    const d = reportData;
    printReport(
      {
        sales: d.sales as any,
        totalRevenue: d.totalRevenue,
        totalCost: d.totalCost,
        totalProfit: d.totalProfit,
        totalTransactions: d.totalTransactions,
        avgSale: d.avgSale,
        topProducts: d.topProducts,
        paymentBreakdown: d.paymentBreakdown,
        dateRange: "All Time",
      },
      bName
    );
  };

  const handleCSV = () => exportCSV(allSales || []);

  const handleQR = () => setShowQR(true);

  const qrUrl = typeof window !== "undefined"
    ? `${window.location.origin}/dashboard/reports?share=${encodeURIComponent(btoa(JSON.stringify({ type: "report", ts: Date.now() })))}`
    : "";

  const maxBar = Math.max(...reportData.last7Days.map((d) => d.total), 1);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-container rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-surface-container rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Reports</h1>
          <p className="text-on-surface-variant text-sm mt-1">Real-time sales analytics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-surface-container-low border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
          <button
            onClick={handleCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-surface-container-low border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={handleQR}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            QR Code
          </button>
        </div>
      </div>

      {/* Revenue Summary — Today */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Today Revenue</div>
          <div className="text-xl font-bold text-on-surface font-headline">{formatMoney(todayRevenue)}</div>
          <div className="text-xs text-on-surface-variant mt-1">{todaySalesCount} sales</div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Today Profit</div>
          <div className="text-xl font-bold text-success font-headline">{formatMoney(todayProfit)}</div>
          <div className="text-xs text-on-surface-variant mt-1">Cost: {formatMoney(todayCost)}</div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">This Week</div>
          <div className="text-xl font-bold text-on-surface font-headline">{formatMoney(reportData.weekRevenue)}</div>
          <div className="text-xs text-success mt-1">Profit: {formatMoney(reportData.weekProfit)}</div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">This Month</div>
          <div className="text-xl font-bold text-on-surface font-headline">{formatMoney(reportData.monthRevenue)}</div>
          <div className="text-xs text-success mt-1">Profit: {formatMoney(reportData.monthProfit)}</div>
        </div>
      </div>

      {/* All Time Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">All Time Revenue</div>
          <div className="text-lg font-bold text-on-surface font-headline">{formatMoney(reportData.totalRevenue)}</div>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">All Time Cost</div>
          <div className="text-lg font-bold text-on-surface font-headline">{formatMoney(reportData.totalCost)}</div>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">All Time Profit</div>
          <div className="text-lg font-bold text-success font-headline">{formatMoney(reportData.totalProfit)}</div>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Avg Sale Value</div>
          <div className="text-lg font-bold text-on-surface font-headline">{formatMoney(reportData.avgSale)}</div>
          <div className="text-xs text-on-surface-variant mt-1">{reportData.totalTransactions} transactions</div>
        </div>
      </div>

      {/* Sales Chart — Last 7 Days */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
        <h2 className="text-lg font-bold text-on-surface font-headline mb-4">Revenue — Last 7 Days</h2>
        {reportData.last7Days.every((d) => d.total === 0) ? (
          <p className="text-on-surface-variant text-sm text-center py-8">No sales in the last 7 days</p>
        ) : (
          <div className="flex items-end gap-2 h-48">
            {reportData.last7Days.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] text-on-surface-variant font-mono">{formatMoney(day.total)}</div>
                <div
                  className="w-full bg-primary/60 rounded-t-lg hover:bg-primary transition-colors"
                  style={{ height: `${(day.total / maxBar) * 140}px`, minHeight: day.total > 0 ? "4px" : "1px" }}
                />
                <div className="text-[10px] text-on-surface-variant">{day.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Products + Payment Methods Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-center">Qty</th>
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

        {/* Payment Methods */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <h2 className="text-lg font-bold text-on-surface font-headline mb-4">Payment Methods</h2>
          {reportData.paymentBreakdown.length === 0 ? (
            <p className="text-on-surface-variant text-sm text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-4">
              {reportData.paymentBreakdown.map((p) => {
                const pct = reportData.totalRevenue > 0 ? (p.total / reportData.totalRevenue) * 100 : 0;
                return (
                  <div key={p.method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-on-surface font-medium">{p.method}</span>
                      <span className="text-on-surface-variant">{formatMoney(p.total)} ({Math.round(pct)}%)</span>
                    </div>
                    <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-on-surface-variant mt-0.5">{p.count} transaction{p.count !== 1 ? "s" : ""}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-surface-container-low rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-on-surface font-headline">Share Report</h3>
              <button onClick={() => setShowQR(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <QRCode url={qrUrl} size={200} label="Scan to view report" />
            </div>
            <p className="text-xs text-on-surface-variant text-center">
              Scan this QR code to view the sales report on your phone
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
