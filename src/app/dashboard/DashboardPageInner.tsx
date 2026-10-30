"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDashboard, DashboardPeriod } from "@/hooks/useDashboard";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useProducts } from "@/hooks/useProducts";
import { formatMoney } from "@/lib/format";
import { DashboardTrendChart, DashboardPaymentDonutChart } from "@/components/dashboard/DashboardCharts";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export default function DashboardPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && (session?.user as any)?.role === "admin") {
      router.replace("/dashboard/admin");
    }
  }, [status, session, router]);

  const {
    period,
    setPeriod,
    todaySalesCount,
    todayRevenue,
    todayProfit,
    todayCost,
    lowStockProducts,
    totalProducts,
    recentSales,
    trendData,
    paymentBreakdown,
    loading,
  } = useDashboard();

  const { data: business } = useBusinessSettings();
  const businessId = business?.id ?? (session?.user as any)?.businessId;
  const { data: inventory } = useProducts(businessId);
  const saleProducts = inventory.filter((product) => product.isActive && !product.deletedAt);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-72 border border-rule bg-surface" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 border border-rule bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  const marginPct = todayRevenue > 0 ? ((todayProfit / todayRevenue) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-8 max-w-[1300px] mx-auto pb-12">
      {/* Header — Greeting, Business Badge & Range Selector */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-rule pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-2xl md:text-3xl font-black text-ink">
              {getGreeting()}, Manager
            </h1>
            <span className="text-xs font-display font-bold px-2 py-0.5 border border-accent text-accent">
              Desktop Pro
            </span>
          </div>
          <p className="font-display text-sm text-secondary">
            Overview & Performance Analytics for <span className="font-black text-ink">{business?.name ?? "your business"}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Time Range Filter Selector */}
          <div className="flex items-center border border-rule overflow-hidden bg-surface text-xs font-display font-bold">
            {[
              { id: "today", label: "Today" },
              { id: "7days", label: "7 Days" },
              { id: "30days", label: "30 Days" },
              { id: "month", label: "This Month" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setPeriod(r.id as DashboardPeriod)}
                className={`px-3 py-2 transition-colors border-r last:border-r-0 border-rule ${
                  period === r.id
                    ? "bg-accent text-white font-black"
                    : "text-secondary hover:text-ink hover:bg-surface-variant"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Link
            href="/dashboard/pos"
            className="font-display font-black px-5 py-2 border border-ink bg-ink text-surface hover:bg-ink/90 flex items-center gap-2 text-sm shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            New Sale
          </Link>
        </div>
      </div>

      {/* Executive Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-rule p-5 bg-surface hover:border-accent/50 transition-colors">
          <div className="flex items-center justify-between">
            <p className="font-display text-xs font-black uppercase tracking-wider text-secondary">Revenue</p>
            <span className="text-[10px] font-display font-black px-2 py-0.5 border border-accent/30 text-accent">
              {todaySalesCount} sales
            </span>
          </div>
          <p className="font-display text-2xl font-black text-ink mt-2">
            {formatMoney(todayRevenue)}
          </p>
          <p className="font-display text-xs text-secondary mt-1">
            {todayRevenue > 0 ? `${period.toUpperCase()} Takings` : "No sales recorded"}
          </p>
        </div>

        <div className="border border-rule p-5 bg-surface hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <p className="font-display text-xs font-black uppercase tracking-wider text-secondary">Gross Profit</p>
            <span className="text-[10px] font-display font-black px-2 py-0.5 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              {marginPct}% margin
            </span>
          </div>
          <p className="font-display text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {formatMoney(todayProfit)}
          </p>
          <p className="font-display text-xs text-secondary mt-1">
            COGS: {formatMoney(todayCost)}
          </p>
        </div>

        <div className="border border-rule p-5 bg-surface hover:border-blue-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <p className="font-display text-xs font-black uppercase tracking-wider text-secondary">Catalog Size</p>
            <span className="text-[10px] font-display font-black px-2 py-0.5 border border-blue-500/30 text-blue-600 dark:text-blue-400">
              {totalProducts} SKUs
            </span>
          </div>
          <p className="font-display text-2xl font-black text-ink mt-2">
            {totalProducts}
          </p>
          <p className="font-display text-xs text-secondary mt-1">Active inventory items</p>
        </div>

        <div className={`border p-5 bg-surface transition-colors ${
          lowStockProducts > 0 ? "border-amber-500/80 bg-amber-500/5" : "border-rule"
        }`}>
          <div className="flex items-center justify-between">
            <p className="font-display text-xs font-black uppercase tracking-wider text-secondary">Low Stock Alert</p>
            {lowStockProducts > 0 && (
              <span className="text-[10px] font-display font-black px-2 py-0.5 bg-amber-500 text-white animate-pulse">
                Attention
              </span>
            )}
          </div>
          <p className={`font-display text-2xl font-black mt-2 ${lowStockProducts > 0 ? "text-amber-600 dark:text-amber-400" : "text-ink"}`}>
            {lowStockProducts}
          </p>
          <p className="font-display text-xs text-secondary mt-1">
            {lowStockProducts > 0 ? "Items need restock" : "All products adequately stocked"}
          </p>
        </div>
      </div>

      {/* Main Desktop Analytics Grid (2 Columns: Trends & Payment Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-rule p-5 bg-surface space-y-4">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div>
              <h2 className="font-display text-lg font-black text-ink">Sales & Profit Trend</h2>
              <p className="font-display text-xs text-secondary">Revenue vs Gross Profit performance across period</p>
            </div>
            <span className="text-xs font-display font-bold text-secondary uppercase tracking-wider">{period}</span>
          </div>

          <DashboardTrendChart data={trendData} />
        </div>

        <div className="space-y-6">
          <DashboardPaymentDonutChart data={paymentBreakdown} />

          {/* Low Stock Attention Widget */}
          {lowStockProducts > 0 && (
            <div className="border border-amber-500/60 bg-amber-500/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="font-display text-sm font-black">Restock Required</h3>
              </div>
              <p className="font-display text-xs text-secondary">
                {lowStockProducts} product{lowStockProducts > 1 ? "s are" : " is"} running low in inventory.
              </p>
              <Link
                href="/dashboard/inventory"
                className="inline-block font-display text-xs font-black text-amber-700 dark:text-amber-300 underline hover:opacity-80"
              >
                View Low Stock Items →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick POS Catalog Launcher Grid */}
      <section aria-labelledby="quick-sale-heading">
        <div className="mb-4 flex items-end justify-between gap-3 border-b border-rule pb-2">
          <div>
            <h2 id="quick-sale-heading" className="font-display text-xl font-black text-ink">Quick Sale Catalog</h2>
            <p className="font-display text-sm text-secondary">Select an item to launch instant checkout at POS.</p>
          </div>
          <Link href="/dashboard/pos" className="shrink-0 text-sm font-black text-accent hover:underline">
            Open Full POS →
          </Link>
        </div>

        {saleProducts.length === 0 ? (
          <div className="border border-rule p-8 text-center text-sm text-secondary font-display">
            Your store catalog is empty. <Link href="/dashboard/inventory" className="font-black text-accent underline">Add products</Link> to enable quick sales.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {saleProducts.slice(0, 12).map((product) => (
              <Link
                key={product.id}
                href={`/dashboard/pos?product=${encodeURIComponent(product.id)}`}
                className="border border-rule bg-surface hover:border-accent hover:shadow-md transition-all group overflow-hidden text-center"
              >
                <div className="aspect-[4/3] border-b border-rule flex items-center justify-center bg-surface-variant/30 overflow-hidden relative">
                  {product.thumbnailUrl || product.imageUrl ? (
                    <img src={product.thumbnailUrl || product.imageUrl} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <svg className="h-8 w-8 text-secondary group-hover:text-accent transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m20 7-8-4-8 4m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                  {product.quantity <= (product.lowStock ?? 5) && !product.isService && (
                    <span className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5">
                      LOW
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-black text-ink">{product.name}</p>
                  <p className="mt-1 text-xs font-black text-accent">{formatMoney(product.sellingPrice)}</p>
                  {!product.isService && (
                    <p className="mt-1 text-[10px] font-display text-secondary">{product.quantity} in stock</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Sales Feed */}
      <div>
        <div className="flex items-center justify-between border-b border-rule pb-2 mb-4">
          <h2 className="font-display text-xl font-black text-ink">Recent Sales Log</h2>
          <Link href="/dashboard/sales" className="text-sm font-black text-secondary hover:underline">
            View All Sales →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recentSales.slice(0, 6).map((sale) => (
            <div key={sale.id} className="flex items-center justify-between border border-rule bg-surface p-4 hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 border border-rule bg-accent/10 text-accent flex items-center justify-center shrink-0 font-black text-xs">
                  POS
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-ink truncate">
                    Sale #{sale.id.slice(-6).toUpperCase()}
                  </p>
                  <p className="font-display text-xs text-secondary">
                    {new Date(sale.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                    <span className="font-bold text-ink uppercase">{sale.paymentMethod || "CASH"}</span>
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-accent">{formatMoney(sale.total)}</p>
                <p className="font-display text-xs text-secondary">{sale.items?.length ?? 0} items</p>
              </div>
            </div>
          ))}

          {recentSales.length === 0 && (
            <div className="col-span-2 text-secondary font-display text-sm text-center py-8 border border-rule bg-surface">
              No sales recorded for this period.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
