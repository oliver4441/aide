"use client";

import { useEffect, useState } from "react";

interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Sale {
  id: string;
  total: number;
  cost: number;
  profit: number;
  paid: number;
  change: number;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
  items: SaleItem[];
}

function formatKES(n: number) {
  return "KSh " + n.toLocaleString("en-KE");
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sales?limit=${limit}&offset=${page * limit}`)
      .then((r) => r.json())
      .then((data) => {
        setSales(data.sales);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-headline)]">Sales History</h1>
          <p className="text-zinc-400 text-sm mt-1">{total} total transactions</p>
        </div>
      </div>

      <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-600">Loading...</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-zinc-600">
            <p className="text-4xl mb-3">🧾</p>
            <p>No sales recorded yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Items</th>
                    <th className="px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Method</th>
                    <th className="px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Total</th>
                    <th className="px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right hidden md:table-cell">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {sales.map((sale) => (
                    <>
                      <tr
                        key={sale.id}
                        className="hover:bg-zinc-800/30 transition-colors cursor-pointer"
                        onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}
                      >
                        <td className="px-5 py-3 text-sm text-zinc-300 whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                        <td className="px-5 py-3 text-sm text-zinc-400 max-w-[200px] truncate">
                          {sale.items.map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}
                        </td>
                        <td className="px-5 py-3 text-xs font-mono text-zinc-500 whitespace-nowrap hidden md:table-cell">
                          {sale.paymentMethod}
                        </td>
                        <td className="px-5 py-3 text-sm font-bold text-white text-right whitespace-nowrap">
                          {formatKES(sale.total)}
                        </td>
                        <td className="px-5 py-3 text-sm text-emerald-400 text-right whitespace-nowrap hidden md:table-cell">
                          {formatKES(sale.profit)}
                        </td>
                      </tr>
                      {expanded === sale.id && (
                        <tr key={`${sale.id}-detail`}>
                          <td colSpan={5} className="px-5 py-4 bg-zinc-900/50">
                            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Receipt</div>
                            <div className="space-y-1">
                              {sale.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span className="text-zinc-300">
                                    {item.name} × {item.quantity}
                                  </span>
                                  <span className="text-white font-mono">{formatKES(item.price * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-dark-border mt-3 pt-3 flex justify-between text-sm">
                              <span className="text-zinc-400">Paid ({sale.paymentMethod})</span>
                              <span className="text-white font-bold">{formatKES(sale.paid)}</span>
                            </div>
                            {sale.change > 0 && (
                              <div className="flex justify-between text-sm mt-1">
                                <span className="text-zinc-400">Change</span>
                                <span className="text-emerald-400">{formatKES(sale.change)}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-dark-border px-5 py-3 flex items-center justify-between">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="text-xs text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-xs text-zinc-500">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-xs text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
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
