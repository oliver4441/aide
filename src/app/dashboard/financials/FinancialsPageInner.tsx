"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/format";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

type Tab = "pl" | "balance" | "cashflow" | "trial";

interface StatementRow {
  label: string;
  amount: number;
}

export default function FinancialsPageInner() {
  const { data: business } = useBusinessSettings();
  const [tab, setTab] = useState<Tab>("pl");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchStatement = useCallback(async () => {
    setLoading(true);
    try {
      const endpoints: Record<Tab, string> = {
        pl: "/api/statements/pl",
        balance: "/api/statements/balance-sheet",
        cashflow: "/api/statements/cash-flow",
        trial: "/api/statements/trial-balance",
      };
      const url = `${endpoints[tab]}?fromDate=${fromDate}&toDate=${toDate}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Data shape: { rows: [{ label, amount }], total }
        if (Array.isArray(data)) {
          setRows(data.map((r: any) => ({ label: r.name || r.code || r.accountCode || "", amount: Number(r.amount || r.balance || 0) })));
          setTotal(data.reduce((s: number, r: any) => s + Number(r.amount || r.balance || 0), 0));
        } else if (data.rows) {
          setRows(data.rows);
          setTotal(Number(data.total || 0));
        } else {
          setRows([]);
          setTotal(0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch statement:", err);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tab, fromDate, toDate]);

  useEffect(() => {
    fetchStatement();
  }, [fetchStatement]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "pl", label: "Profit & Loss" },
    { key: "balance", label: "Balance Sheet" },
    { key: "cashflow", label: "Cash Flow" },
    { key: "trial", label: "Trial Balance" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-6">Financial Statements</h1>

      {/* Date Range */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div>
          <label className="block text-xs text-secondary mb-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-rule bg-surface text-ink text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-secondary mb-1">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-rule bg-surface text-ink text-sm"
          />
        </div>
        <button
          onClick={fetchStatement}
          disabled={loading}
          className="mt-3 px-4 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-rule">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "text-accent border-b-2 border-accent"
                : "text-secondary hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Statement Table */}
      <div className="rounded-lg border border-rule overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface border-b border-rule">
              <th className="text-left p-3 text-ink font-semibold">Account</th>
              <th className="text-right p-3 text-ink font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={2} className="p-8 text-center text-secondary">
                  No data for this period. Make some sales to see financial statements.
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-rule/50 hover:bg-surface/50">
                <td className="p-3 text-ink">{row.label}</td>
                <td className={`p-3 text-right font-mono ${row.amount < 0 ? "text-red-500" : "text-ink"}`}>
                  {formatMoney(row.amount, business?.currency)}
                </td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="bg-surface font-bold">
                <td className="p-3 text-ink">Total</td>
                <td className="p-3 text-right font-mono text-accent">
                  {formatMoney(total, business?.currency)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
