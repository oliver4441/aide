"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/hooks/useDashboard";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { formatMoney } from "@/lib/format";

export default function DashboardPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && (session?.user as any)?.role === "admin") {
      router.replace("/dashboard/admin");
    }
  }, [status, session, router]);

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
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          New Sale
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container rounded-2xl border border-outline-variant p-5">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Today&apos;s Revenue</p>
          <p className="text-2xl font-bold text-on-surface mt-1 font-headline">
            {formatMoney(todayRevenue)}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            {todayRevenue > 0 ? "Today" : "No sales yet"}
          </p>
        </div>
        <div className="bg-surface-container rounded-2xl border border-outline-variant p-5">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Today&apos;s Profit</p>
          <p className="text-2xl font-bold text-on-surface mt-1 font-headline">
            {formatMoney(todayProfit)}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            {todayProfit > 0 ? "On track" : "—"}
          </p>
        </div>
        <div className="bg-surface-container rounded-2xl border border-outline-variant p-5">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Products</p>
          <p className="text-2xl font-bold text-on-surface mt-1 font-headline">
            {totalProducts}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">{lowStockProducts > 0 ? `${lowStockProducts} low stock` : "All stocked"}</p>
        </div>
        <div className="bg-surface-container rounded-2xl border border-outline-variant p-5">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Low Stock</p>
          <p className="text-2xl font-bold text-on-surface mt-1 font-headline">
            {lowStockProducts}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">{lowStockProducts > 0 ? "Check inventory" : "All stocked"}</p>
        </div>
      </div>

      {/* Recent Sales */}
      <div>
        <h2 className="text-xl font-bold text-on-surface font-headline mb-4">Recent Sales</h2>
        <div className="space-y-2">
          {recentSales.slice(0, 5).map((sale) => (
            <div key={sale.id} className="flex items-center justify-between bg-surface-container rounded-xl border border-outline-variant px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6a2 2 0 100-4 2 2 0 000 4z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{sale.business?.name ?? "Sale"}</p>
                  <p className="text-xs text-on-surface-variant">{new Date(sale.createdAt).toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })} · {sale.paymentMethod}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-on-surface">{formatMoney(sale.total)}</p>
                <p className="text-xs text-on-surface-variant">{sale.items?.length ?? 0} items</p>
              </div>
            </div>
          ))}
          {recentSales.length === 0 && (
            <p className="text-on-surface-variant text-sm text-center py-8">No sales yet — start your first sale at the POS.</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "New Sale", href: "/dashboard/pos", icon: "point" },
          { label: "Inventory", href: "/dashboard/inventory", icon: "inventory" },
          { label: "Sales History", href: "/dashboard/sales", icon: "sales" },
          { label: "Reports", href: "/dashboard/reports", icon: "reports" },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-surface-container border border-outline-variant rounded-xl p-4 hover:bg-surface-container-high transition-colors text-center"
          >
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/15 flex items-center justify-center">
              {action.icon === "point" && (
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              )}
              {action.icon === "inventory" && (
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              )}
              {action.icon === "sales" && (
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
              {action.icon === "reports" && (
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            <p className="text-sm font-medium text-on-surface">{action.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
