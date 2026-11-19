"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/format";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface Customer {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  creditLimit: string | number;
  balance: string | number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CustomersPageInner() {
  const { data: business } = useBusinessSettings();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showPayment, setShowPayment] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    creditLimit: "0",
  });

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/customers");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || (c.phone || "").includes(q);
  });

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", address: "", notes: "", creditLimit: "0" });
    setEditing(null);
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, creditLimit: Number(form.creditLimit) || 0 };

    try {
      if (editing) {
        const res = await fetch(`/api/customers/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
      } else {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create");
      }
      resetForm();
      await fetchCustomers();
    } catch (err) {
      console.error(err);
      alert("Failed to save customer");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer? Cannot delete if they have unpaid invoices.")) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Cannot delete customer");
        return;
      }
      await fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      notes: customer.notes || "",
      creditLimit: String(customer.creditLimit),
    });
    setShowModal(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayment) return;
    try {
      const res = await fetch(`/api/customers/${showPayment.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentAmount),
          paymentMethod,
        }),
      });
      if (!res.ok) throw new Error("Failed to record payment");
      setShowPayment(null);
      setPaymentAmount("");
      await fetchCustomers();
    } catch (err) {
      console.error(err);
      alert("Failed to record payment");
    }
  };

  const totalBalance = customers.reduce((sum, c) => sum + Number(c.balance), 0);

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
            Customers
          </h1>
          <p className="font-display text-sm text-secondary">
            {customers.length} customer{customers.length !== 1 ? "s" : ""} · {formatMoney(totalBalance, business?.currency)} outstanding
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="np-btn"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search by name, code, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-rule bg-ground text-ink font-display text-control focus:outline-none"
        />
      </div>

      {/* Customer List — ruled rows */}
      {filtered.length === 0 && (
        <div className="border border-rule p-8 text-center">
          <p className="font-display text-sm text-secondary">
            No customers found. Add your first customer to get started.
          </p>
        </div>
      )}
      <div className="space-y-0">
        {filtered.map((customer) => {
          const balance = Number(customer.balance);
          const creditLimit = Number(customer.creditLimit);
          const overLimit = creditLimit > 0 && balance > creditLimit;

          return (
            <div
              key={customer.id}
              className="flex items-start justify-between border-b border-rule px-4 py-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display text-sm font-black text-ink">{customer.name}</h3>
                  <span className="font-display text-xs text-secondary font-mono">{customer.code}</span>
                  {!customer.isActive && (
                    <span className="font-display text-xs font-black uppercase tracking-wider text-secondary line-through">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 font-display text-sm text-secondary">
                  {customer.phone && <span>{customer.phone}</span>}
                  {customer.email && <span>{customer.email}</span>}
                </div>
                <div className="flex items-center gap-4 mt-1 font-display text-sm">
                  <span className={overLimit ? "text-accent font-black" : "text-ink"}>
                    {formatMoney(balance, business?.currency)}
                  </span>
                  {creditLimit > 0 && (
                    <span className="text-secondary">
                      Limit: {formatMoney(creditLimit, business?.currency)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-4">
                {balance > 0 && (
                  <button
                    onClick={() => { setShowPayment(customer); setPaymentAmount(""); }}
                    className="np-btn !px-2 !py-1"
                    title="Record payment"
                  >
                    Pay
                  </button>
                )}
                <button
                  onClick={() => handleEdit(customer)}
                  className="np-btn !px-2 !py-1"
                  title="Edit"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(customer.id)}
                  className="np-btn !px-2 !py-1 np-btn--accent"
                  title="Delete"
                >
                  Del
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="bg-ground border border-ink w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="font-display text-lg font-black text-ink">
                {editing ? "Edit Customer" : "Add Customer"}
              </h2>
              <button onClick={resetForm} className="p-1 text-secondary hover:text-ink">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="np-kicker">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  placeholder="Customer name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="np-kicker">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                    placeholder="+254..."
                  />
                </div>
                <div>
                  <label className="np-kicker">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="np-kicker">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  placeholder="Street, city..."
                />
              </div>
              <div>
                <label className="np-kicker">Credit Limit</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.creditLimit}
                  onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  placeholder="0 (no credit)"
                />
              </div>
              <div>
                <label className="np-kicker">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="np-btn flex-1">
                  Cancel
                </button>
                <button type="submit" className="np-btn flex-1 np-btn--accent">
                  {editing ? "Update" : "Add"} Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="bg-ground border border-ink w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="font-display text-lg font-black text-ink">Record Payment</h2>
              <button onClick={() => setShowPayment(null)} className="p-1 text-secondary hover:text-ink">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handlePayment} className="p-4 space-y-4">
              <div className="font-display text-sm text-secondary border-b border-rule pb-3">
                <div>Customer: <span className="font-black text-ink">{showPayment.name}</span></div>
                <div className="mt-1">Balance: <span className="font-black text-ink">{formatMoney(showPayment.balance, business?.currency)}</span></div>
              </div>
              <div>
                <label className="np-kicker">Amount</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={showPayment.balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="np-kicker">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                >
                  <option value="CASH">Cash</option>
                  <option value="MPESA">M-Pesa</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPayment(null)} className="np-btn flex-1">
                  Cancel
                </button>
                <button type="submit" className="np-btn flex-1 np-btn--accent">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
