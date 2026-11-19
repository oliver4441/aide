"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/format";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { Plus, Search, Edit2, Trash2, X, CreditCard, Phone, Mail } from "lucide-react";

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

  if (loading) return <div className="text-secondary">Loading customers...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Customers</h1>
          <p className="text-secondary text-sm mt-1">
            {customers.length} customers · {formatMoney(totalBalance, business?.currency)} outstanding
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
        <input
          type="text"
          placeholder="Search by name, code, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Customer List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-secondary">
            No customers found. Add your first customer to get started.
          </div>
        )}
        {filtered.map((customer) => {
          const balance = Number(customer.balance);
          const creditLimit = Number(customer.creditLimit);
          const overLimit = creditLimit > 0 && balance > creditLimit;

          return (
            <div
              key={customer.id}
              className="p-4 rounded-lg border border-rule bg-surface hover:border-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink">{customer.name}</h3>
                    <span className="text-xs text-secondary font-mono">{customer.code}</span>
                    {!customer.isActive && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-secondary">
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </span>
                    )}
                    {customer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {customer.email}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className={overLimit ? "text-red-500 font-semibold" : "text-ink"}>
                      Balance: {formatMoney(balance, business?.currency)}
                    </span>
                    {creditLimit > 0 && (
                      <span className="text-secondary">
                        Limit: {formatMoney(creditLimit, business?.currency)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {balance > 0 && (
                    <button
                      onClick={() => { setShowPayment(customer); setPaymentAmount(""); }}
                      className="p-2 text-accent hover:bg-accent/10 rounded transition-colors"
                      title="Record payment"
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(customer)}
                    className="p-2 text-secondary hover:bg-accent/10 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="p-2 text-secondary hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-ground rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="text-lg font-bold text-ink">
                {editing ? "Edit Customer" : "Add Customer"}
              </h2>
              <button onClick={resetForm} className="p-1 hover:bg-surface rounded">
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="Customer name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="+254..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="Street, city..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Credit Limit</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.creditLimit}
                  onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="0 (no credit)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 px-4 py-2.5 rounded-lg border border-rule text-ink hover:bg-surface transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors">
                  {editing ? "Update" : "Add"} Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-ground rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="text-lg font-bold text-ink">Record Payment</h2>
              <button onClick={() => setShowPayment(null)} className="p-1 hover:bg-surface rounded">
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>
            <form onSubmit={handlePayment} className="p-4 space-y-4">
              <div className="text-sm text-secondary">
                Customer: <span className="font-semibold text-ink">{showPayment.name}</span>
                <br />
                Balance: <span className="font-semibold text-ink">{formatMoney(showPayment.balance, business?.currency)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Amount *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={showPayment.balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="CASH">Cash</option>
                  <option value="MPESA">M-Pesa</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPayment(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-rule text-ink hover:bg-surface transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors">
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
