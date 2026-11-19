"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/format";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

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
          <p className="np-kicker mb-1">Accounts Payable</p>
          <h1 className="font-display text-2xl md:text-3xl font-black text-ink mb-1">
            Suppliers
          </h1>
          <p className="font-display text-sm text-secondary">
            {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""} · {formatMoney(totalBalance, business?.currency)} owed
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="np-btn"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Supplier
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

      {/* Supplier List — ruled rows */}
      {filtered.length === 0 && (
        <div className="border border-rule p-8 text-center">
          <p className="font-display text-sm text-secondary">
            No suppliers found. Add your first supplier to get started.
          </p>
        </div>
      )}
      <div className="space-y-0">
        {filtered.map((supplier) => (
          <div
            key={supplier.id}
            className="flex items-start justify-between border-b border-rule px-4 py-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-sm font-black text-ink">{supplier.name}</h3>
                <span className="font-display text-xs text-secondary font-mono">{supplier.code}</span>
                {!supplier.isActive && (
                  <span className="font-display text-xs font-black uppercase tracking-wider text-secondary line-through">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 font-display text-sm text-secondary">
                {supplier.phone && <span>{supplier.phone}</span>}
                {supplier.email && <span>{supplier.email}</span>}
              </div>
              <div className="flex items-center gap-4 mt-1 font-display text-sm">
                <span className={Number(supplier.balance) > 0 ? "text-accent font-black" : "text-ink"}>
                  {formatMoney(supplier.balance, business?.currency)}
                </span>
                {supplier.paymentTerms > 0 && (
                  <span className="text-secondary">{supplier.paymentTerms}-day terms</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-4">
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
                className="np-btn !px-2 !py-1"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(supplier.id)}
                className="np-btn !px-2 !py-1 np-btn--accent"
              >
                Del
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="bg-ground border border-ink w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="font-display text-lg font-black text-ink">
                {editing ? "Edit Supplier" : "Add Supplier"}
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
                  placeholder="Supplier name"
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
                <label className="np-kicker">Payment Terms (days)</label>
                <input
                  type="number"
                  min="0"
                  value={form.paymentTerms}
                  onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  placeholder="30"
                />
              </div>
              <div>
                <label className="np-kicker">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="np-btn flex-1">
                  Cancel
                </button>
                <button type="submit" className="np-btn flex-1 np-btn--accent">
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
