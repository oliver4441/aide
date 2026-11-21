"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/format";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: { id: string; name: string; phone?: string | null; email?: string | null };
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: string | number;
  tax: string | number;
  total: string | number;
  amountPaid: string | number;
  balanceDue: string | number;
  notes?: string;
  createdAt: string;
}

interface CustomerOption {
  id: string;
  name: string;
}

export default function InvoicesPageInner() {
  const { data: business } = useBusinessSettings();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newInvoice, setNewInvoice] = useState({
    customerId: "",
    description: "",
    quantity: "1",
    unitPrice: "",
    notes: "",
  });

  const fetchInvoices = useCallback(async () => {
    try {
      const [invRes, custRes] = await Promise.all([
        fetch("/api/invoices"),
        fetch("/api/customers?active=true"),
      ]);
      if (invRes.ok) {
        setInvoices(await invRes.json());
      }
      if (custRes.ok) {
        setCustomers(await custRes.json());
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
    const num = (inv.invoiceNumber || "").toLowerCase();
    const cust = (inv.customer?.name || "").toLowerCase();
    return num.includes(q) || cust.includes(q);
  });

  const statusLabel = (status: string) => {
    switch (status) {
      case "PAID": return <span className="font-display text-xs font-black uppercase tracking-wider text-success">Paid</span>;
      case "PARTIALLY_PAID": return <span className="font-display text-xs font-black uppercase tracking-wider text-warning">Partially Paid</span>;
      case "CANCELLED": return <span className="font-display text-xs font-black uppercase tracking-wider text-accent">Cancelled</span>;
      default: return <span className="font-display text-xs font-black uppercase tracking-wider text-secondary">{status}</span>;
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: newInvoice.customerId,
          notes: newInvoice.notes,
          lines: [
            {
              description: newInvoice.description.trim(),
              quantity: Number(newInvoice.quantity) || 1,
              unitPrice: Number(newInvoice.unitPrice) || 0,
            },
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || "Failed to create invoice");
        return;
      }
      setShowCreate(false);
      setNewInvoice({ customerId: "", description: "", quantity: "1", unitPrice: "", notes: "" });
      await fetchInvoices();
    } catch {
      setCreateError("Network error while creating invoice");
    } finally {
      setCreating(false);
    }
  };

  const totalOutstanding = invoices.reduce(
    (s, inv) => s + Math.max(0, Number(inv.total) - Number(inv.amountPaid || 0)),
    0
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 border-b border-rule" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 border border-rule" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header — ruled */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-rule pb-6">
        <div>
          <p className="np-kicker mb-1">Accounts Receivable</p>
          <h1 className="font-display text-2xl md:text-3xl font-black text-ink mb-1">
            Invoices
          </h1>
          <p className="font-display text-sm text-secondary">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} · {formatMoney(totalOutstanding, business?.currency)} outstanding
          </p>
        </div>
        <button
          onClick={() => {
            setCreateError("");
            setShowCreate(true);
          }}
          className="np-btn"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Invoice
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search by invoice number or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-rule bg-ground text-ink font-display text-control focus:outline-none"
        />
      </div>

      {/* Invoice List — ruled rows */}
      {filtered.length === 0 && (
        <div className="border border-rule p-8 text-center">
          <p className="font-display text-sm text-secondary">No invoices found.</p>
        </div>
      )}
      <div className="space-y-0">
        {filtered.map((inv) => {
          const balance = Math.max(0, Number(inv.total) - Number(inv.amountPaid || 0));
          return (
            <div
              key={inv.id}
              className="flex items-start justify-between border-b border-rule px-4 py-4 cursor-pointer hover:bg-ink/5"
              onClick={() => setSelected(inv)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-sm font-black text-ink">{inv.invoiceNumber}</span>
                  {statusLabel(inv.status)}
                </div>
                <div className="font-display text-sm text-secondary mt-1">
                  {inv.customer?.name || "Customer"} · Due {new Date(inv.dueDate).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <div className="font-mono font-black text-ink">
                  {formatMoney(inv.total, business?.currency)}
                </div>
                {balance > 0 && (
                  <div className="font-mono text-sm text-accent">
                    {formatMoney(balance, business?.currency)} due
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Invoice Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="bg-ground border border-ink w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="font-display text-lg font-black text-ink">New Invoice</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-secondary hover:text-ink">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateInvoice} className="p-4 space-y-4">
              <div>
                <label className="np-kicker">Customer</label>
                <select
                  required
                  value={newInvoice.customerId}
                  onChange={(e) => setNewInvoice({ ...newInvoice, customerId: e.target.value })}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="np-kicker">Item / Description</label>
                <input
                  required
                  value={newInvoice.description}
                  onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  placeholder="Service or goods description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="np-kicker">Quantity</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={newInvoice.quantity}
                    onChange={(e) => setNewInvoice({ ...newInvoice, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="np-kicker">Unit Price</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newInvoice.unitPrice}
                    onChange={(e) => setNewInvoice({ ...newInvoice, unitPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="np-kicker">Notes</label>
                <textarea
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                />
              </div>
              {createError && <p className="text-xs text-accent font-display">{createError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="np-btn flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="np-btn flex-1 np-btn--accent">
                  {creating ? "Creating..." : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="bg-ground border border-ink w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="font-display text-lg font-black text-ink">{selected.invoiceNumber}</h2>
              <button onClick={() => setSelected(null)} className="p-1 text-secondary hover:text-ink">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {statusLabel(selected.status)}
              <div className="font-display text-sm">
                <span className="text-secondary">Customer:</span>{" "}
                <span className="font-black text-ink">{selected.customer?.name || "Customer"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-display text-sm">
                <div><span className="text-secondary">Issue Date:</span> {new Date(selected.issueDate).toLocaleDateString()}</div>
                <div><span className="text-secondary">Due Date:</span> {new Date(selected.dueDate).toLocaleDateString()}</div>
              </div>
              <div className="border-t border-rule pt-3 space-y-1 font-display text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Subtotal:</span>
                  <span className="font-mono text-ink">{formatMoney(selected.subtotal, business?.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Tax:</span>
                  <span className="font-mono text-ink">{formatMoney(selected.tax, business?.currency)}</span>
                </div>
                <div className="flex justify-between font-black">
                  <span className="text-ink">Total:</span>
                  <span className="font-mono text-ink">{formatMoney(selected.total, business?.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Paid:</span>
                  <span className="font-mono text-success">{formatMoney(selected.amountPaid || 0, business?.currency)}</span>
                </div>
                <div className="border-t border-rule pt-1 flex justify-between font-black">
                  <span className="text-ink">Balance:</span>
                  <span className="font-mono text-accent">
                    {formatMoney(Math.max(0, Number(selected.total) - Number(selected.amountPaid || 0)), business?.currency)}
                  </span>
                </div>
              </div>
              {selected.notes && (
                <div className="font-display text-sm text-secondary italic border-t border-rule pt-2">
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
