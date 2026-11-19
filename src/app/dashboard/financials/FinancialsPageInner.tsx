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
    <div className="space-y-8">
      {/* Header — ruled */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-rule pb-6">
        <div>
          <p className="np-kicker mb-1">Accounting</p>
          <h1 className="font-display text-2xl md:text-3xl font-black text-ink mb-1">
            Financial Statements
          </h1>
          <p className="font-display text-sm text-secondary">
            Profit & Loss, Balance Sheet, Cash Flow, and Trial Balance
          </p>
        </div>
      </div>

      {/* Date Range — inline */}
      <div className="flex items-end gap-6 flex-wrap border-b border-rule pb-4">
        <div>
          <label className="np-kicker">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
          />
        </div>
        <div>
          <label className="np-kicker">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
          />
        </div>
        <button
          onClick={fetchStatement}
          disabled={loading}
          className="np-btn"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Tabs — ruled */}
      <div className="flex gap-0 border-b border-rule">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 font-display text-sm font-black ${
              tab === t.key
                ? "text-ink border-b-2 border-ink -mb-px"
                : "text-secondary hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Statement Table — ruled */}
      <div className="border border-rule overflow-hidden">
        <table className="w-full font-display text-sm">
          <thead>
            <tr className="border-b border-rule">
              <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Account</th>
              <th className="text-right p-3 text-ink font-black uppercase tracking-wider text-xs">Amount</th>
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
              <tr key={i} className="border-b border-rule/50">
                <td className="p-3 text-ink">{row.label}</td>
                <td className={`p-3 text-right font-mono ${row.amount < 0 ? "text-accent" : "text-ink"}`}>
                  {formatMoney(row.amount, business?.currency)}
                </td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="border-t-2 border-ink">
                <td className="p-3 text-ink font-black">Total</td>
                <td className="p-3 text-right font-mono font-black text-accent">
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
