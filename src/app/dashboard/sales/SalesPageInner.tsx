"use client";

import { useState } from "react";
import { useSales } from "@/hooks/useSales";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { formatMoney } from "@/lib/format";
import { printReceipt } from "@/components/receipt/PrintReceipt";
import SalesLog from "@/components/reports/SalesLog";

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
  a.download = `aide-sales-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(sales: any[]) {
  const blob = new Blob([JSON.stringify(sales, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aide-sales-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SalesPage() {
  const { data: allSales, loading } = useSales();
  const { data: business } = useBusinessSettings();
  const [exportMenu, setExportMenu] = useState(false);

  const sales = allSales ?? [];
  const total = sales.length;
  const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Activity Log</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {total} transaction{total !== 1 ? "s" : ""} — {formatMoney(totalRevenue)}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setExportMenu(!exportMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-surface-container-low border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {exportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportMenu(false)} />
                <div className="absolute right-0 mt-1 z-20 bg-surface-container-low border border-outline-variant rounded-lg shadow-lg py-1 min-w-[140px]">
                  <button
                    onClick={() => { exportCSV(sales); setExportMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-on-surface hover:bg-surface-container transition-colors"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => { exportJSON(sales); setExportMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-on-surface hover:bg-surface-container transition-colors"
                  >
                    Export as JSON
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <SalesLog
        sales={sales}
        loading={loading}
        onPrint={(sale) => printReceipt(sale as any, business || { name: "Aide Business" })}
      />
    </div>
  );
}
