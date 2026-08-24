"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Sale {
  id: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  items: SaleItem[];
}

interface LowStock {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
}

interface DashboardData {
  todaySales: number;
  todayProfit: number;
  salesCount: number;
  totalProducts: number;
  lowStockItems: LowStock[];
  recentSales: Sale[];
  salesChange: number;
}

function formatKES(amount: number) {
  return "KSh " + amount.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function timeAgo(date: string) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-dark-surface rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-dark-surface rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-dark-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 font-[family-name:var(--font-headline)]">
            Good business, Manager
          </h1>
          <p className="text-zinc-400 text-sm">Here is what&apos;s happening at Beauty Hub Salon today.</p>
        </div>
        <Link
          href="/pos"
          className="md:hidden bg-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-primary-light transition-colors flex items-center gap-2 text-sm shadow-lg shadow-primary/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Sale
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Today's Sales"
          value={formatKES(data.todaySales)}
          icon="💰"
          change={data.salesChange > 0 ? `+${data.salesChange}% vs yesterday` : undefined}
          changePositive={data.salesChange >= 0}
        />
        <MetricCard
          label="Today's Profit"
          value={formatKES(data.todayProfit)}
          icon="📈"
          change={data.salesChange > 0 ? `+${data.salesChange}% vs yesterday` : undefined}
          changePositive={data.todayProfit > 0}
        />
        <MetricCard
          label="Total Products"
          value={data.totalProducts.toString()}
          icon="📦"
          change="Active inventory items"
        />
        <MetricCard
          label="Low Stock"
          value={data.lowStockItems.length.toString()}
          icon="⚠️"
          change={data.lowStockItems.length > 0 ? "Action required" : "All stocked up"}
          isWarning={data.lowStockItems.length > 0}
        />
      </div>

      {/* Recent Sales + Stock Watch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-border flex justify-between items-center">
            <h2 className="text-lg font-bold text-white font-[family-name:var(--font-headline)]">Recent Sales</h2>
            <Link href="/sales" className="text-xs font-medium text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Time</th>
                  <th className="px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Items</th>
                  <th className="px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Method</th>
                  <th className="px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {data.recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-zinc-600">
                      No sales yet today. Make your first sale!
                    </td>
                  </tr>
                ) : (
                  data.recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3 text-zinc-400 text-sm whitespace-nowrap">
                        {timeAgo(sale.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-sm text-zinc-300 max-w-[200px] truncate">
                        {sale.items.map((i) => i.name).join(", ")}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-zinc-500 whitespace-nowrap">
                        {sale.paymentMethod}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-right text-white whitespace-nowrap">
                        {formatKES(sale.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Watch */}
        <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-dark-border">
            <h2 className="text-lg font-bold text-white font-[family-name:var(--font-headline)] flex items-center gap-2">
              Stock Watch
              {data.lowStockItems.length > 0 && (
                <span className="text-amber-400 text-sm">⚠</span>
              )}
            </h2>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-3">
            {data.lowStockItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
                All products well stocked ✓
              </div>
            ) : (
              data.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border border-dark-border rounded-lg bg-zinc-900/50"
                >
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{item.name}</div>
                    <div className="text-xs text-zinc-500 font-mono">{item.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${item.quantity <= 2 ? "text-red-400" : "text-amber-400"}`}>
                      {item.quantity}
                    </div>
                    <div className="text-[10px] text-zinc-500">left</div>
                  </div>
                </div>
              ))
            )}
            <Link
              href="/inventory"
              className="w-full mt-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg py-2.5 hover:bg-primary/10 transition-colors text-center"
            >
              Manage Inventory
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  change,
  changePositive = true,
  isWarning = false,
}: {
  label: string;
  value: string;
  icon: string;
  change?: string;
  changePositive?: boolean;
  isWarning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-5 border transition-colors ${
        isWarning
          ? "bg-red-500/10 border-red-500/20"
          : "bg-dark-surface border-dark-border hover:border-primary/30"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white mb-1 font-[family-name:var(--font-headline)]">{value}</div>
      {change && (
        <div className={`text-xs flex items-center gap-1 ${changePositive ? "text-emerald-400" : "text-red-400"}`}>
          {change}
        </div>
      )}
    </div>
  );
}
