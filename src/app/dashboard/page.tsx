"use client";

import Link from "next/link";
import { useDashboard } from "@/hooks/useDashboard";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { formatMoney, timeAgo } from "@/lib/format";

export default function DashboardPage() {
  const {
    todayRevenue,
    todayProfit,
    totalProducts,
    lowStockProducts,
    recentSales,
    loading,
  } = useDashboard();
  const { data: business } = useBusinessSettings();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-surface-container rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-container rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-outline-variant pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-1 font-headline">
            Good business, Manager
          </h1>
          <p className="text-on-surface-variant text-sm">
            Here is what&apos;s happening at {business?.name ?? "your business"} today.
          </p>
        </div>
        <Link
          href="/dashboard/pos"
          className="md:hidden bg-primary text-on-primary font-semibold px-6 py-2.5 rounded-xl hover:bg-primary-light transition-colors flex items-center gap-2 text-sm shadow-lg shadow-primary/20"
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
          value={formatMoney(todayRevenue)}
          iconType="dollar"
        />
        <MetricCard
          label="Today's Profit"
          value={formatMoney(todayProfit)}
          iconType="chart"
        />
        <MetricCard
          label="Total Products"
          value={totalProducts.toString()}
          iconType="box"
          change="Active inventory items"
        />
        <MetricCard
          label="Low Stock"
          value={lowStockProducts.toString()}
          iconType="warning"
          change={lowStockProducts > 0 ? "Action required" : "All stocked up"}
          isWarning={lowStockProducts > 0}
        />
      </div>

      {/* Recent Sales + Stock Watch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center">
            <h2 className="text-lg font-bold text-on-surface font-headline">Recent Sales</h2>
            <Link href="/dashboard/sales" className="text-xs font-medium text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Time</th>
                  <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Total</th>
                  <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center text-on-surface-variant/60">
                      No sales yet today. Make your first sale!
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="px-5 py-3 text-on-surface-variant text-sm whitespace-nowrap">
                        {timeAgo(sale.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-on-surface whitespace-nowrap">
                        {formatMoney(sale.total)}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-on-surface-variant whitespace-nowrap">
                        {sale.paymentMethod}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Watch */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-outline-variant">
              <h2 className="text-lg font-bold text-on-surface font-headline flex items-center gap-2">
              Stock Watch
              {lowStockProducts > 0 && (
                <span className="text-warning">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </span>
              )}
            </h2>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-3">
            {lowStockProducts === 0 ? (
              <div className="flex-1 flex items-center justify-center text-on-surface-variant/60 text-sm">
                All products well stocked
              </div>
            ) : (
              <p className="text-on-surface-variant text-sm">
                {lowStockProducts} product{lowStockProducts !== 1 ? "s" : ""} running low on stock.
              </p>
            )}
            <Link
              href="/dashboard/inventory"
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

const metricIcons: Record<string, JSX.Element> = {
  dollar: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  box: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
};

function MetricCard({
  label,
  value,
  iconType,
  change,
  changePositive = true,
  isWarning = false,
}: {
  label: string;
  value: string;
  iconType: string;
  change?: string;
  changePositive?: boolean;
  isWarning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-5 border transition-colors ${
        isWarning
          ? "bg-danger/10 border-danger/20"
          : "bg-surface-container-low border-outline-variant hover:border-primary/30"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">{label}</span>
        <span className={`${isWarning ? "text-danger" : "text-on-surface-variant/60"}`}>
          {metricIcons[iconType]}
        </span>
      </div>
      <div className="text-2xl font-bold text-on-surface mb-1 font-headline">{value}</div>
      {change && (
        <div className={`text-xs flex items-center gap-1 ${changePositive ? "text-success" : "text-danger"}`}>
          {change}
        </div>
      )}
    </div>
  );
}
