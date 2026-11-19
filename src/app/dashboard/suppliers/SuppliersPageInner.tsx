"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/format";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { Plus, Search, Edit2, Trash2, X, Phone, Mail } from "lucide-react";

interface Supplier {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  paymentTerms: number;
  balance: string | number;
  isActive: boolean;
}

export default function SuppliersPageInner() {
  const { data: business } = useBusinessSettings();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    paymentTerms: "30",
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.phone || "").includes(q);
  });

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", address: "", notes: "", paymentTerms: "30" });
    setEditing(null);
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, paymentTerms: Number(form.paymentTerms) || 0 };
    try {
      if (editing) {
        const res = await fetch(`/api/suppliers/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
      } else {
        const res = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create");
      }
      resetForm();
      await fetchSuppliers();
    } catch (err) {
      console.error(err);
      alert("Failed to save supplier");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Cannot delete supplier");
        return;
      }
      await fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  const totalBalance = suppliers.reduce((sum, s) => sum + Number(s.balance), 0);

  if (loading) return <div className="text-secondary">Loading suppliers...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Suppliers</h1>
          <p className="text-secondary text-sm mt-1">
            {suppliers.length} suppliers · {formatMoney(totalBalance, business?.currency)} owed
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

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

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-secondary">
            No suppliers found. Add your first supplier to get started.
          </div>
        )}
        {filtered.map((supplier) => (
          <div
            key={supplier.id}
            className="p-4 rounded-lg border border-rule bg-surface hover:border-accent/30 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink">{supplier.name}</h3>
                  <span className="text-xs text-secondary font-mono">{supplier.code}</span>
                  {!supplier.isActive && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-secondary">
                  {supplier.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {supplier.phone}
                    </span>
                  )}
                  {supplier.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {supplier.email}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className={Number(supplier.balance) > 0 ? "text-red-500 font-semibold" : "text-ink"}>
                    Balance: {formatMoney(supplier.balance, business?.currency)}
                  </span>
                  {supplier.paymentTerms > 0 && (
                    <span className="text-secondary">{supplier.paymentTerms}-day terms</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditing(supplier);
                    setForm({
                      name: supplier.name,
                      email: supplier.email || "",
                      phone: supplier.phone || "",
                      address: supplier.address || "",
                      notes: supplier.notes || "",
                      paymentTerms: String(supplier.paymentTerms),
                    });
                    setShowModal(true);
                  }}
                  className="p-2 text-secondary hover:bg-accent/10 rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(supplier.id)}
                  className="p-2 text-secondary hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-ground rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="text-lg font-bold text-ink">
                {editing ? "Edit Supplier" : "Add Supplier"}
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
                  placeholder="Supplier name"
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
                <label className="block text-sm font-medium text-ink mb-1">Payment Terms (days)</label>
                <input
                  type="number"
                  min="0"
                  value={form.paymentTerms}
                  onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 px-4 py-2.5 rounded-lg border border-rule text-ink hover:bg-surface transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors">
                  {editing ? "Update" : "Add"} Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
