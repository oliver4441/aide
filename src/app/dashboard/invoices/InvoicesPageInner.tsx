"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/format";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { Plus, Search, X } from "lucide-react";

interface Invoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: string | number;
  tax: string | number;
  total: string | number;
  paidAmount: string | number;
  notes?: string;
  createdAt: string;
}

export default function InvoicesPageInner() {
  const { data: business } = useBusinessSettings();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch("/api/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    return inv.invoiceNo.toLowerCase().includes(q) || inv.customerName.toLowerCase().includes(q);
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "PAID": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "PARTIALLY_PAID": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "CANCELLED": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  const totalOutstanding = invoices.reduce((s, inv) => s + Number(inv.total) - Number(inv.paidAmount), 0);

  if (loading) return <div className="text-secondary">Loading invoices...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Invoices</h1>
          <p className="text-secondary text-sm mt-1">
            {invoices.length} invoices · {formatMoney(totalOutstanding, business?.currency)} outstanding
          </p>
        </div>
        <button
          onClick={() => alert("Invoice creation — coming soon. For now, create invoices via credit sales at the POS.")}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
        <input
          type="text"
          placeholder="Search by invoice number or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-secondary">
            No invoices found.
          </div>
        )}
        {filtered.map((inv) => {
          const balance = Number(inv.total) - Number(inv.paidAmount);
          return (
            <div
              key={inv.id}
              className="p-4 rounded-lg border border-rule bg-surface hover:border-accent/30 transition-colors cursor-pointer"
              onClick={() => setSelected(inv)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{inv.invoiceNo}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="text-sm text-secondary mt-1">
                    {inv.customerName} · Due {new Date(inv.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold text-ink">
                    {formatMoney(inv.total, business?.currency)}
                  </div>
                  {balance > 0 && (
                    <div className="text-sm text-red-500 font-mono">
                      {formatMoney(balance, business?.currency)} due
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-ground rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="text-lg font-bold text-ink">{selected.invoiceNo}</h2>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-surface rounded">
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <span className={`text-xs px-2 py-0.5 rounded ${statusColor(selected.status)}`}>
                {selected.status}
              </span>
              <div className="text-sm">
                <span className="text-secondary">Customer:</span>{" "}
                <span className="text-ink font-semibold">{selected.customerName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-secondary">Issue Date:</span> {new Date(selected.issueDate).toLocaleDateString()}</div>
                <div><span className="text-secondary">Due Date:</span> {new Date(selected.dueDate).toLocaleDateString()}</div>
              </div>
              <div className="border-t border-rule pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Subtotal:</span>
                  <span className="font-mono text-ink">{formatMoney(selected.subtotal, business?.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Tax:</span>
                  <span className="font-mono text-ink">{formatMoney(selected.tax, business?.currency)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-ink">Total:</span>
                  <span className="font-mono text-ink">{formatMoney(selected.total, business?.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Paid:</span>
                  <span className="font-mono text-green-500">{formatMoney(selected.paidAmount, business?.currency)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-ink">Balance:</span>
                  <span className="font-mono text-red-500">
                    {formatMoney(Number(selected.total) - Number(selected.paidAmount), business?.currency)}
                  </span>
                </div>
              </div>
              {selected.notes && (
                <div className="text-sm text-secondary italic border-t border-rule pt-2">
                  {selected.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
