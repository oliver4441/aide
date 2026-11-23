"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/format";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { AIDE_ACCOUNTING_BRANDING } from "@/lib/accountingBranding.mjs";
import { KENYA_DEFAULTS, buildFinancialCsv } from "@/lib/kenyaLocalization.mjs";

type Tab = "pl" | "balance" | "cashflow" | "trial";

interface StatementLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

interface StatementRow {
  label: string;
  amount: number;
  isTotal?: boolean;
  isSection?: boolean;
}

function appendSectionRows(
  rows: StatementRow[],
  section: { label: string; lines: StatementLine[]; total: number } | undefined,
  includeTotal = true
) {
  if (!section) return;
  rows.push({ label: section.label, amount: section.total, isSection: true });
  for (const line of section.lines) {
    if (line.balance !== 0) {
      rows.push({
        label: `${line.accountCode} · ${line.accountName}`,
        amount: line.balance,
      });
    }
  }
  if (includeTotal) {
    rows.push({ label: `Total ${section.label}`, amount: section.total, isTotal: true });
  }
}

export default function FinancialsPageInner() {
  const { data: business } = useBusinessSettings();
  const [tab, setTab] = useState<Tab>("pl");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [summaryLabel, setSummaryLabel] = useState("Total");
  const [summaryTotal, setSummaryTotal] = useState(0);
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
        pl: `/api/statements/pl?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`,
        balance: `/api/statements/balance-sheet?atDate=${encodeURIComponent(toDate)}`,
        cashflow: `/api/statements/cash-flow?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`,
        trial: `/api/statements/trial-balance?atDate=${encodeURIComponent(toDate)}`,
      };
      const res = await fetch(endpoints[tab]);
      if (!res.ok) {
        setRows([]);
        setSummaryTotal(0);
        return;
      }

      const data = await res.json();
      const nextRows: StatementRow[] = [];

      if (tab === "pl") {
        appendSectionRows(nextRows, data.revenue);
        appendSectionRows(nextRows, data.costOfSales);
        nextRows.push({ label: "Gross Profit", amount: Number(data.grossProfit || 0), isTotal: true });
        appendSectionRows(nextRows, data.expenses);
        setRows(nextRows);
        setSummaryLabel("Net Profit");
        setSummaryTotal(Number(data.netProfit || 0));
      } else if (tab === "balance") {
        appendSectionRows(nextRows, data.currentAssets);
        appendSectionRows(nextRows, data.fixedAssets);
        nextRows.push({ label: "Total Assets", amount: Number(data.totalAssets || 0), isTotal: true });
        appendSectionRows(nextRows, data.currentLiabilities);
        appendSectionRows(nextRows, data.longTermLiabilities);
        appendSectionRows(nextRows, data.equity, false);
        nextRows.push({ label: "Retained Earnings", amount: Number(data.retainedEarnings || 0) });
        nextRows.push({ label: "Total Equity", amount: Number(data.totalEquity || 0), isTotal: true });
        setRows(nextRows);
        setSummaryLabel("Total Liabilities & Equity");
        setSummaryTotal(Number(data.totalLiabilitiesAndEquity || 0));
      } else if (tab === "cashflow") {
        appendSectionRows(nextRows, data.operatingActivities);
        appendSectionRows(nextRows, data.investingActivities);
        appendSectionRows(nextRows, data.financingActivities);
        setRows(nextRows);
        setSummaryLabel("Net Change in Cash");
        setSummaryTotal(Number(data.netChangeInCash || 0));
      } else {
        for (const line of data.lines || []) {
          nextRows.push({
            label: `${line.accountCode} · ${line.accountName}`,
            amount: Number(line.balance || 0),
          });
        }
        setRows(nextRows);
        setSummaryLabel(data.balanced ? "Balanced (Debit - Credit)" : "Out of Balance");
        setSummaryTotal(Number(data.totalDebit || 0) - Number(data.totalCredit || 0));
      }
    } catch (err) {
      console.error("Failed to fetch statement:", err);
      setRows([]);
      setSummaryTotal(0);
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
          <p className="np-kicker mb-1">{AIDE_ACCOUNTING_BRANDING.productName}</p>
          <h1 className="font-display text-2xl md:text-3xl font-black text-ink mb-1">
            Financial Statements
          </h1>
          <p className="font-display text-sm text-secondary">
            Profit & Loss, Balance Sheet, Cash Flow, and Trial Balance · {KENYA_DEFAULTS.timezone} ({business?.currency || KENYA_DEFAULTS.currency})
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const csv = buildFinancialCsv(rows, [
              { key: "label", label: "Account / Line" },
              { key: "amount", label: `Amount (${business?.currency || KENYA_DEFAULTS.currency})` },
            ]);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `aide-financial-${tab}-${toDate}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          disabled={rows.length === 0}
          className="px-3 py-1.5 border border-ink text-xs font-display font-bold uppercase tracking-wider hover:bg-ink hover:text-ground disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {/* Date Range — inline */}
      <div className="flex items-end gap-6 flex-wrap border-b border-rule pb-4">
        {(tab === "pl" || tab === "cashflow") && (
          <div>
            <label className="np-kicker">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
            />
          </div>
        )}
        <div>
          <label className="np-kicker">{tab === "pl" || tab === "cashflow" ? "To" : "As Of"}</label>
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
      <div className="flex gap-0 border-b border-rule overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 font-display text-sm font-black whitespace-nowrap ${
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
              <tr
                key={i}
                className={
                  row.isSection
                    ? "border-b border-rule bg-ink/5 font-black"
                    : row.isTotal
                      ? "border-b border-ink/40 font-black"
                      : "border-b border-rule/50"
                }
              >
                <td className={`p-3 ${row.isSection || row.isTotal ? "text-ink" : "text-ink pl-6"}`}>
                  {row.label}
                </td>
                <td className={`p-3 text-right font-mono ${row.amount < 0 ? "text-accent" : "text-ink"}`}>
                  {row.isSection ? "" : formatMoney(row.amount, business?.currency)}
                </td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="border-t-2 border-ink">
                <td className="p-3 text-ink font-black">{summaryLabel}</td>
                <td className="p-3 text-right font-mono font-black text-accent">
                  {formatMoney(summaryTotal, business?.currency)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legal & AGPL-3.0 Attribution Notice */}
      <footer className="border-t border-rule pt-4 text-xs text-secondary flex flex-wrap items-center justify-between gap-2">
        <span>{AIDE_ACCOUNTING_BRANDING.legalNotices.attributionText}</span>
        <a
          href={AIDE_ACCOUNTING_BRANDING.legalNotices.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-ink"
        >
          Source ({AIDE_ACCOUNTING_BRANDING.legalNotices.license})
        </a>
      </footer>
    </div>
  );
}
