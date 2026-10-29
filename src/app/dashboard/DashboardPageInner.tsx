"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/hooks/useDashboard";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useProducts } from "@/hooks/useProducts";
import { formatMoney } from "@/lib/format";

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
    todayRevenue,
    todayProfit,
    totalProducts,
    lowStockProducts,
    recentSales,
    loading,
  } = useDashboard();
  const { data: business } = useBusinessSettings();
  const businessId = business?.id ?? (session?.user as any)?.businessId;
  const { data: inventory } = useProducts(businessId);
  const saleProducts = inventory.filter((product) => product.isActive && !product.deletedAt);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 border-b border-rule" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 border border-rule" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header — ruled, 3:1 split */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-rule pb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-ink mb-1">
            {getGreeting()}, Manager
          </h1>
          <p className="font-display text-sm text-secondary">
            Here is what&apos;s happening at {business?.name ?? "your business"} today.
          </p>
        </div>
        <Link
          href="/dashboard/pos"
          className="font-display font-black px-6 py-2.5 border border-ink text-ink flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          New Sale
        </Link>
      </div>

      {/* Stats Cards — simple ruled blocks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-rule p-5">
          <p className="font-display text-xs font-black uppercase tracking-wider text-secondary">Today&apos;s Revenue</p>
          <p className="font-display text-2xl font-black text-ink mt-1">
            {formatMoney(todayRevenue)}
          </p>
          <p className="font-display text-xs text-secondary mt-1">
            {todayRevenue > 0 ? "Today" : "No sales yet"}
          </p>
        </div>

        <div className="border border-rule p-5">
          <p className="font-display text-xs font-black uppercase tracking-wider text-secondary">Today&apos;s Profit</p>
          <p className="font-display text-2xl font-black text-ink mt-1">
            {formatMoney(todayProfit)}
          </p>
          <p className="font-display text-xs text-secondary mt-1">
            {todayProfit > 0 ? "On track" : "—"}
          </p>
        </div>

        <div className="border border-rule p-5">
          <p className="font-display text-xs font-black uppercase tracking-wider text-secondary">Products</p>
          <p className="font-display text-2xl font-black text-ink mt-1">
            {totalProducts}
          </p>
          <p className="font-display text-xs text-secondary mt-1">{lowStockProducts > 0 ? `${lowStockProducts} low stock` : "All stocked"}</p>
        </div>

        <div className="border border-rule p-5">
          <p className="font-display text-xs font-black uppercase tracking-wider text-secondary">Low Stock</p>
          <p className="font-display text-2xl font-black text-ink mt-1">
            {lowStockProducts}
          </p>
          <p className="font-display text-xs text-secondary mt-1">{lowStockProducts > 0 ? "Check inventory" : "All stocked"}</p>
        </div>
      </div>

      {/* Start a sale — ruled */}
      <section aria-labelledby="quick-sale-heading">
        <div className="mb-4 flex items-end justify-between gap-3 border-b border-rule pb-2">
          <div>
            <h2 id="quick-sale-heading" className="font-display text-xl font-black text-ink">Start a sale</h2>
            <p className="font-display text-sm text-secondary">Choose a product to add it to a new sale.</p>
          </div>
          <Link href="/dashboard/pos" className="shrink-0 text-sm font-black text-secondary hover:underline">Open full POS</Link>
        </div>
        {saleProducts.length === 0 ? (
          <div className="border border-rule p-6 text-sm text-secondary">
            Your inventory is empty. <Link href="/dashboard/inventory" className="font-black text-secondary hover:underline">Add a product</Link> to start selling.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {saleProducts.map((product) => (
              <Link
                key={product.id}
                href={`/dashboard/pos?product=${encodeURIComponent(product.id)}`}
                aria-label={`Create a sale with ${product.name}, ${formatMoney(product.sellingPrice)}`}
                className="border border-rule group overflow-hidden text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="aspect-[4/3] border-b border-rule flex items-center justify-center overflow-hidden">
                  {product.thumbnailUrl || product.imageUrl ? (
                    <img src={product.thumbnailUrl || product.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <svg className="h-9 w-9 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m20 7-8-4-8 4m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-black text-ink">{product.name}</p>
                  <p className="mt-1 text-sm font-black text-accent">{formatMoney(product.sellingPrice)}</p>
                  {!product.isService && <p className="mt-1 text-xs text-secondary">{product.quantity} in stock</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Sales */}
      <div>
        <h2 className="font-display text-xl font-black text-ink mb-4 border-b border-rule pb-2">Recent Sales</h2>
        <div className="space-y-2">
          {recentSales.slice(0, 5).map((sale) => (
            <div key={sale.id} className="flex items-center justify-between border border-rule px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 border border-rule flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6a2 2 0 100-4 2 2 0 000 4z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-ink truncate">{sale.business?.name ?? "Sale"}</p>
                  <p className="font-display text-xs text-secondary">{new Date(sale.createdAt).toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })} · {sale.paymentMethod}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-ink">{formatMoney(sale.total)}</p>
                <p className="font-display text-xs text-secondary">{sale.items?.length ?? 0} items</p>
              </div>
            </div>
          ))}
          {recentSales.length === 0 && (
            <p className="text-secondary font-display text-sm text-center py-8">No sales yet — start your first sale at the POS.</p>
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
            className="border border-rule p-4 text-center"
          >
            <div className="w-10 h-10 mx-auto mb-2 border border-rule flex items-center justify-center">
              {action.icon === "point" && (
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              )}
              {action.icon === "inventory" && (
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              )}
              {action.icon === "sales" && (
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
              {action.icon === "reports" && (
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            <p className="font-display text-sm font-black text-ink">{action.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
