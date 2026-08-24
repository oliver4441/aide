"use client";

import { useState } from "react";
import { Fragment } from "react";
import { useSales } from "@/hooks/useSales";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { formatMoney, formatDate } from "@/lib/format";
import { printReceipt } from "@/components/receipt/PrintReceipt";

export default function SalesPage() {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data: allSales, loading } = useSales();
  const { data: business } = useBusinessSettings();
  const limit = 20;

  const sales = allSales ?? [];
  const total = sales.length;
  const totalPages = Math.ceil(total / limit);
  const paged = sales.slice(page * limit, (page + 1) * limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Sales History</h1>
          <p className="text-on-surface-variant text-sm mt-1">{total} total transactions</p>
        </div>
      </div>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant/60">Loading...</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant/60">
            <p className="text-4xl mb-3">🧾</p>
            <p>No sales recorded yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider hidden md:table-cell">Method</th>
                    <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">Total</th>
                    <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right hidden md:table-cell">Profit</th>
                    <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {paged.map((sale) => (
                    <Fragment key={sale.id}>
                      <tr
                        className="hover:bg-surface-container/30 transition-colors cursor-pointer"
                        onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}
                      >
                        <td className="px-5 py-3 text-sm text-on-surface whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                        <td className="px-5 py-3 text-xs font-mono text-on-surface-variant whitespace-nowrap hidden md:table-cell">
                          {sale.paymentMethod}
                        </td>
                        <td className="px-5 py-3 text-sm font-bold text-on-surface text-right whitespace-nowrap">
                          {formatMoney(sale.total)}
                        </td>
                        <td className="px-5 py-3 text-sm text-success text-right whitespace-nowrap hidden md:table-cell">
                          {formatMoney(sale.profit)}
                        </td>
                        <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => printReceipt(sale as any, business || { name: "Aide Business" })}
                            className="text-xs text-on-surface-variant hover:text-primary transition-colors"
                          >
                            Print
                          </button>
                        </td>
                      </tr>
                      {expanded === sale.id && (
                        <tr>
                          <td colSpan={5} className="px-5 py-4 bg-surface-container/50">
                            <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Details</div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-on-surface-variant">Payment</span>
                              <span className="text-on-surface">{sale.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-on-surface-variant">Paid</span>
                              <span className="text-on-surface font-bold">{formatMoney(sale.paid)}</span>
                            </div>
                            {sale.change > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-on-surface-variant">Change</span>
                                <span className="text-success">{formatMoney(sale.change)}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-outline-variant px-5 py-3 flex items-center justify-between">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="text-xs text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-xs text-on-surface-variant">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-xs text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
