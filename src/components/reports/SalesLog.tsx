"use client";

import { useState, useMemo } from "react";
import { formatMoney, formatDate, timeAgo } from "@/lib/format";

interface SaleRecord {
  id: string;
  total: number;
  cost: number;
  profit: number;
  paid: number;
  change: number;
  paymentMethod: string;
  items?: { name: string; quantity: number; price: number; cost: number }[];
  createdAt: string;
  cashier?: string;
}

interface SalesLogProps {
  sales: SaleRecord[];
  loading: boolean;
  onPrint?: (sale: SaleRecord) => void;
}

type DateFilter = "today" | "7days" | "30days" | "all";

function getDateRange(filter: DateFilter): Date {
  const now = new Date();
  switch (filter) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "7days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "30days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    case "all":
    default:
      return new Date(0);
  }
}

function PaymentMethodIcon({ method }: { method: string }) {
  const m = method.toLowerCase();
  if (m.includes("mpesa") || m.includes("m-pesa") || m.includes("mobile")) {
    return (
      <div className="w-9 h-9 border border-rule bg-success/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  if (m.includes("card") || m.includes("credit") || m.includes("debit")) {
    return (
      <div className="w-9 h-9 border border-rule bg-accent/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-9 h-9 border border-rule bg-warning/20 flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    </div>
  );
}

export default function SalesLog({ sales, loading, onPrint }: SalesLogProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const filteredSales = useMemo(() => {
    const cutoff = getDateRange(dateFilter);
    return sales.filter((s) => {
      if (new Date(s.createdAt) < cutoff) return false;
      if (paymentFilter !== "all" && s.paymentMethod.toLowerCase() !== paymentFilter.toLowerCase()) return false;
      return true;
    });
  }, [sales, dateFilter, paymentFilter]);

  const totalFiltered = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);

  const paymentMethods = useMemo(() => {
    const methods = new Set(sales.map((s) => s.paymentMethod));
    return Array.from(methods);
  }, [sales]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 border border-rule bg-ground" />
        ))}
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="border border-rule bg-ground p-12 text-center">
        <svg className="w-12 h-12 text-secondary/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="font-display text-secondary">No sales recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-reading">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 border border-rule bg-ground p-1 font-display">
          {(["today", "7days", "30days", "all"] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-3 py-1.5 text-xs font-black border border-rule ${
                dateFilter === f
                  ? "bg-ink text-ground"
                  : "text-secondary hover:text-ink"
              }`}
            >
              {f === "today" ? "Today" : f === "7days" ? "7 Days" : f === "30days" ? "30 Days" : "All"}
            </button>
          ))}
        </div>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="border border-rule bg-ground text-ink font-display text-xs px-3 py-1.5 focus:outline-none focus:border-accent"
        >
          <option value="all">All Methods</option>
          {paymentMethods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center justify-between text-xs font-display border-b border-rule pb-2">
        <span className="text-secondary">{totalFiltered} transaction{totalFiltered !== 1 ? "s" : ""}</span>
        <span className="font-black text-ink">{formatMoney(totalRevenue)}</span>
      </div>

      {/* Activity Log */}
      <div className="space-y-2">
        {filteredSales.map((sale) => {
          const isExpanded = expandedId === sale.id;
          const items = sale.items || [];

          return (
            <div
              key={sale.id}
              className="border border-rule bg-ground overflow-hidden"
            >
              {/* Log Entry Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-ground/70"
              >
                <PaymentMethodIcon method={sale.paymentMethod} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-display font-black text-ink truncate">
                      Sale — {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-secondary font-mono flex-shrink-0">{timeAgo(sale.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-display">
                    <span className="font-black text-ink">{formatMoney(sale.total)}</span>
                    <span className="text-secondary">—</span>
                    <span className="text-secondary">{sale.paymentMethod}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {onPrint && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrint(sale);
                      }}
                      className="text-xs text-secondary hover:text-accent p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </button>
                  )}
                  <svg
                    className={`w-4 h-4 text-secondary ${isExpanded ? "" : "hidden"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-rule px-4 py-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div>
                      <div className="text-[10px] font-display font-black uppercase tracking-wider text-secondary mb-0.5">Date</div>
                      <div className="text-xs font-display text-ink">{formatDate(sale.createdAt, { hour: undefined, minute: undefined })}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-display font-black uppercase tracking-wider text-secondary mb-0.5">Time</div>
                      <div className="text-xs font-display text-ink">{formatDate(sale.createdAt, { day: undefined, month: undefined, year: undefined })}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-display font-black uppercase tracking-wider text-secondary mb-0.5">Paid</div>
                      <div className="text-xs font-display font-black text-ink">{formatMoney(sale.paid)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-display font-black uppercase tracking-wider text-secondary mb-0.5">Profit</div>
                      <div className="text-xs font-display font-black text-success">{formatMoney(sale.profit)}</div>
                    </div>
                  </div>
                  {sale.change > 0 && (
                    <div className="mb-3 border-t border-rule pt-2">
                      <div className="text-[10px] font-display font-black uppercase tracking-wider text-secondary mb-0.5">Change Given</div>
                      <div className="text-xs font-display font-black text-success">{formatMoney(sale.change)}</div>
                    </div>
                  )}
                  {items.length > 0 && (
                    <div className="border-t border-rule pt-2">
                      <div className="text-[10px] font-display font-black uppercase tracking-wider text-secondary mb-1">Items</div>
                      <div className="space-y-1">
                        {items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-ink font-display truncate max-w-[60%]">
                              {item.name}
                            </span>
                            <span className="text-secondary">
                              {item.quantity} × {formatMoney(item.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
