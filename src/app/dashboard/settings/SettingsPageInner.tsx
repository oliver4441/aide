"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import db from "@/lib/db";
import { liveQuery } from "dexie";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { data: business, mutate: mutateBusiness } = useBusinessSettings();
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "Salon",
    currency: "KSh",
    taxRate: "16",
    receiptFooter: "",
  });

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name || "",
        type: business.type || "Salon",
        currency: business.currency || "KSh",
        taxRate: String(business.taxRate ?? 16),
        receiptFooter: business.receiptFooter || "",
      });
    }
  }, [business]);

  useEffect(() => {
    const sub = liveQuery(() =>
      db.syncConflicts.where("status").equals("pending").toArray()
    ).subscribe((records) => setConflicts(records));
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    const sub = liveQuery(() => db.categories.toArray()).subscribe((cats) => {
      setCategories(cats.filter((c) => !c.deletedAt).map((c) => ({ id: c.id, name: c.name })));
    });
    return () => sub.unsubscribe();
  }, []);

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.categories.put({
      id,
      name: newCategory.trim(),
      businessId: business?.id || localStorage.getItem("aide_business_id") || "",
      sortOrder: categories.length,
      syncStatus: "pending",
      createdAt: new Date().toISOString(),
    });
    setNewCategory("");
  };

  const deleteCategory = async (id: string) => {
    await db.categories.update(id, { syncStatus: "pending" as const, deletedAt: new Date().toISOString() });
  };

  const save = async () => {
    if (!business) return;
    await mutateBusiness({
      name: form.name,
      type: form.type,
      currency: form.currency,
      taxRate: parseFloat(form.taxRate) || 16,
      receiptFooter: form.receiptFooter,
    });
  };

  const exportData = async () => {
    const [products, categories, sales, saleItems] = await Promise.all([
      db.products.toArray(),
      db.categories.toArray(),
      db.sales.toArray(),
      db.saleItems.toArray(),
    ]);
    const payload = { products, categories, sales, saleItems, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aide-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface font-headline">Settings</h1>
        <p className="text-on-surface-variant text-sm mt-1">Manage your business profile and preferences</p>
      </div>

      {/* Account */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
        <h2 className="text-lg font-bold text-on-surface font-headline mb-4">Account</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              {session?.user?.name?.[0] || "U"}
            </div>
            <div>
              <div className="text-sm font-medium text-on-surface">{session?.user?.name}</div>
              <div className="text-xs text-on-surface-variant">{session?.user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Profile */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
        <h2 className="text-lg font-bold text-on-surface font-headline mb-4">Business Profile</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Business Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Business Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option>Salon</option>
                <option>Shop</option>
                <option>Restaurant</option>
                <option>Grocery</option>
                <option>Pharmacy</option>
                <option>Electronics</option>
                <option>Clothing</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Currency</label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Tax Rate (%)</label>
              <input
                type="number"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Receipt Footer</label>
            <textarea
              value={form.receiptFooter}
              onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={save}
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-light transition-colors shadow-lg shadow-primary/20"
          >
            Save Changes
          </button>
          <button
            onClick={() => {
              if (business) {
                setForm({
                  name: business.name || "",
                  type: business.type || "Salon",
                  currency: business.currency || "KSh",
                  taxRate: String(business.taxRate ?? 16),
                  receiptFooter: business.receiptFooter || "",
                });
              }
            }}
            className="px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Sync & Conflicts */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
        <h2 className="text-lg font-bold text-on-surface font-headline mb-4">Sync & Conflicts</h2>
        {conflicts.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No pending conflicts.</p>
        ) : (
          <div className="space-y-3">
            {conflicts.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 border border-outline-variant rounded-lg bg-surface-container/50">
                <div>
                  <div className="text-sm font-medium text-on-surface capitalize">{c.entityType} conflict</div>
                  <div className="text-xs text-on-surface-variant font-mono">{c.entityId.slice(0, 8)}</div>
                </div>
                <span className="text-xs text-warning font-medium">Pending</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Categories */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
        <h2 className="text-lg font-bold text-on-surface font-headline mb-4">Product Categories</h2>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="New category name..."
              className="flex-1 px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={addCategory}
              disabled={!newCategory.trim()}
              className="px-4 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-40"
            >
              Add
            </button>
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No categories yet. Add one above.</p>
          ) : (
            <div className="space-y-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-container/50 transition-colors"
                >
                  <span className="text-sm text-on-surface">{cat.name}</span>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-xs text-on-surface-variant hover:text-danger transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
        <h2 className="text-lg font-bold text-on-surface font-headline mb-4">Preferences</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm text-on-surface">Low Stock Alerts</div>
              <div className="text-xs text-on-surface-variant">Get notified when products run low</div>
            </div>
            <div className="w-11 h-6 bg-surface-container-high rounded-full relative cursor-pointer">
              <div className="w-5 h-5 bg-on-surface rounded-full absolute top-0.5 left-0.5 transition-transform" />
            </div>
          </label>
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm text-on-surface">Daily Summary Email</div>
              <div className="text-xs text-on-surface-variant">Receive end-of-day sales summary</div>
            </div>
            <div className="w-11 h-6 bg-primary rounded-full relative cursor-pointer">
              <div className="w-5 h-5 bg-on-primary rounded-full absolute top-0.5 right-0.5 transition-transform" />
            </div>
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-surface-container-low border border-danger/20 rounded-xl p-6">
        <h2 className="text-lg font-bold text-danger font-headline mb-2">Danger Zone</h2>
        <p className="text-xs text-on-surface-variant mb-4">These actions cannot be undone.</p>
        <div className="flex gap-3">
          <button
            onClick={exportData}
            className="px-4 py-2 rounded-xl border border-danger/30 text-danger text-xs font-medium hover:bg-danger/10 transition-colors"
          >
            Export All Data
          </button>
          <button className="px-4 py-2 rounded-xl border border-danger/30 text-danger text-xs font-medium hover:bg-danger/10 transition-colors">
            Delete Business
          </button>
        </div>
      </div>
    </div>
  );
}
