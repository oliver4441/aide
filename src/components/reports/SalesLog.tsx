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
      <div className="w-9 h-9 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  if (m.includes("card") || m.includes("credit") || m.includes("debit")) {
    return (
      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
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
          <div key={i} className="h-16 bg-surface-container rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-12 text-center">
        <svg className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-on-surface-variant">No sales recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-surface-container-low border border-outline-variant rounded-lg p-1">
          {(["today", "7days", "30days", "all"] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                dateFilter === f
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {f === "today" ? "Today" : f === "7days" ? "7 Days" : f === "30days" ? "30 Days" : "All"}
            </button>
          ))}
        </div>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="all">All Methods</option>
          {paymentMethods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center justify-between text-xs text-on-surface-variant">
        <span>{totalFiltered} transaction{totalFiltered !== 1 ? "s" : ""}</span>
        <span className="font-medium text-on-surface">{formatMoney(totalRevenue)}</span>
      </div>

      {/* Activity Log */}
      <div className="space-y-2">
        {filteredSales.map((sale) => {
          const isExpanded = expandedId === sale.id;
          const items = sale.items || [];

          return (
            <div
              key={sale.id}
              className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden transition-all"
            >
              {/* Log Entry Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-container/30 transition-colors"
              >
                <PaymentMethodIcon method={sale.paymentMethod} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-on-surface truncate">
                      Sale — {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-on-surface-variant flex-shrink-0">{timeAgo(sale.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="font-medium text-on-surface">{formatMoney(sale.total)}</span>
                    <span className="text-outline-variant">—</span>
                    <span>{sale.paymentMethod}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {onPrint && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrint(sale);
                      }}
                      className="text-xs text-on-surface-variant hover:text-primary transition-colors p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </button>
                  )}
                  <svg
                    className={`w-4 h-4 text-on-surface-variant transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                <div className="border-t border-outline-variant px-4 py-3 bg-surface-container/50">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-0.5">Date</div>
                      <div className="text-xs text-on-surface">{formatDate(sale.createdAt, { hour: undefined, minute: undefined })}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-0.5">Time</div>
                      <div className="text-xs text-on-surface">{formatDate(sale.createdAt, { day: undefined, month: undefined, year: undefined })}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-0.5">Paid</div>
                      <div className="text-xs text-on-surface font-medium">{formatMoney(sale.paid)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-0.5">Profit</div>
                      <div className="text-xs text-success font-medium">{formatMoney(sale.profit)}</div>
                    </div>
                  </div>
                  {sale.change > 0 && (
                    <div className="mb-3">
                      <div className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-0.5">Change Given</div>
                      <div className="text-xs text-success font-medium">{formatMoney(sale.change)}</div>
                    </div>
                  )}
                  {items.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Items</div>
                      <div className="space-y-1">
                        {items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-on-surface truncate max-w-[60%]">
                              {item.name}
                            </span>
                            <span className="text-on-surface-variant">
                              {item.quantity} x {formatMoney(item.price)}
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
