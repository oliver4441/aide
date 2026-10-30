"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import db from "@/lib/db";
import { liveQuery } from "dexie";
import {
  isNotificationsEnabled,
  setNotificationsEnabled,
  isCategoryEnabled,
  setCategoryEnabled,
  NOTIFICATION_CATEGORIES,
  type NotificationType,
} from "@/lib/notifications";

function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm text-ink">{label}</div>
        <div className="text-xs text-secondary">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${value ? "border-accent bg-accent" : "border-rule bg-rule/30"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full  transition-all ${value ? "right-0.5 bg-ground" : "left-0.5 bg-ink"}`}
        />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { data: business, mutate: mutateBusiness } = useBusinessSettings();
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [notifEnabled, setNotifEnabledState] = useState(true);
  const [notifCats, setNotifCats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const en = await isNotificationsEnabled();
      if (!active) return;
      setNotifEnabledState(en);
      const map: Record<string, boolean> = {};
      for (const c of NOTIFICATION_CATEGORIES) map[c.type] = await isCategoryEnabled(c.type);
      if (active) setNotifCats(map);
    })();
    return () => {
      active = false;
    };
  }, []);

  const setNotifEnabled = async (v: boolean) => {
    await setNotificationsEnabled(v);
    setNotifEnabledState(v);
  };
  const setNotifCat = async (t: NotificationType, v: boolean) => {
    await setCategoryEnabled(t, v);
    setNotifCats((m) => ({ ...m, [t]: v }));
  };

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

  // --- Account: change email / password ---
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const saveEmail = async () => {
    setEmailStatus(null);
    setSavingEmail(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailStatus({ ok: false, msg: data.error || "Could not update email" });
        return;
      }
      setEmailStatus({
        ok: true,
        msg: "Email updated. Signing you out — please log in with your new email.",
      });
      // The session token still carries the old email, so sign out to refresh it.
      setTimeout(() => signOut({ callbackUrl: "/login" }), 1500);
    } catch {
      setEmailStatus({ ok: false, msg: "Network error — please try again" });
    } finally {
      setSavingEmail(false);
    }
  };

  const savePassword = async () => {
    setPasswordStatus(null);
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ ok: false, msg: "New passwords do not match" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordStatus({ ok: false, msg: data.error || "Could not update password" });
        return;
      }
      setPasswordStatus({ ok: true, msg: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordStatus({ ok: false, msg: "Network error — please try again" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-black text-ink">Settings</h1>
        <p className="text-secondary text-sm mt-1">Manage your business profile and preferences</p>
      </div>

      {/* Account */}
      <div className="bg-ground border border-rule p-6">
        <h2 className="font-display text-lg font-black text-ink mb-4">Account</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg">
              {session?.user?.name?.[0] || "U"}
            </div>
            <div>
              <div className="text-sm font-medium text-ink">{session?.user?.name}</div>
              <div className="text-xs text-secondary">{session?.user?.email}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowEmailForm((v) => !v);
                setEmailStatus(null);
              }}
              className="px-4 py-2 border border-rule text-secondary text-xs font-medium hover:bg-rule/15 transition-colors"
            >
              Change Email
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm((v) => !v);
                setPasswordStatus(null);
              }}
              className="px-4 py-2 border border-rule text-secondary text-xs font-medium hover:bg-rule/15 transition-colors"
            >
              Change Password
            </button>
          </div>

          {showEmailForm && (
            <div className="space-y-2 border-t border-rule pt-4">
              <label className="block text-xs font-medium text-secondary">
                New email address
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={session?.user?.email || "you@example.com"}
                  className="flex-1 px-3 py-2.5 bg-ground border border-rule text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <button
                  onClick={saveEmail}
                  disabled={savingEmail || !newEmail.trim()}
                  className="px-4 py-2.5 bg-accent text-ground text-sm font-semibold hover:bg-ink transition-colors disabled:opacity-40"
                >
                  {savingEmail ? "Saving..." : "Update Email"}
                </button>
              </div>
              <p className="text-xs text-secondary">
                You will be signed out and asked to log in with your new email.
              </p>
              {emailStatus && (
                <p className={`text-xs font-medium ${emailStatus.ok ? "text-accent" : "text-danger"}`}>
                  {emailStatus.msg}
                </p>
              )}
            </div>
          )}

          {showPasswordForm && (
            <div className="space-y-2 border-t border-rule pt-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 bg-ground border border-rule text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    New password (min 8 characters)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 bg-ground border border-rule text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 bg-ground border border-rule text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
              <button
                onClick={savePassword}
                disabled={savingPassword || !currentPassword || !newPassword}
                className="px-4 py-2.5 bg-accent text-ground text-sm font-semibold hover:bg-ink transition-colors disabled:opacity-40"
              >
                {savingPassword ? "Saving..." : "Update Password"}
              </button>
              {passwordStatus && (
                <p className={`text-xs font-medium ${passwordStatus.ok ? "text-accent" : "text-danger"}`}>
                  {passwordStatus.msg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Business Profile */}
      <div className="bg-ground border border-rule p-6">
        <h2 className="font-display text-lg font-black text-ink mb-4">Business Profile</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Business Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 bg-ground border border-rule text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Business Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2.5 bg-ground border border-rule text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
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
              <label className="block text-xs font-medium text-secondary mb-1">Currency</label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2.5 bg-ground border border-rule text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Tax Rate (%)</label>
              <input
                type="number"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                className="w-full px-3 py-2.5 bg-ground border border-rule text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Receipt Footer</label>
            <textarea
              value={form.receiptFooter}
              onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 bg-ground border border-rule text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={save}
            className="px-5 py-2.5 bg-accent text-ground text-sm font-semibold hover:bg-ink transition-colors"
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
            className="px-5 py-2.5 border border-rule text-secondary text-sm font-medium hover:bg-rule/15 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Sync & Conflicts */}
      <div className="bg-ground border border-rule p-6">
        <h2 className="font-display text-lg font-black text-ink mb-4">Sync & Conflicts</h2>
        {conflicts.length === 0 ? (
          <p className="text-sm text-secondary">No pending conflicts.</p>
        ) : (
          <div className="space-y-3">
            {conflicts.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 border border-rule bg-ground/50">
                <div>
                  <div className="text-sm font-medium text-ink capitalize">{c.entityType} conflict</div>
                  <div className="text-xs text-secondary font-mono">{c.entityId.slice(0, 8)}</div>
                </div>
                <span className="text-xs text-warning font-medium">Pending</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Categories */}
      <div className="bg-ground border border-rule p-6">
        <h2 className="font-display text-lg font-black text-ink mb-4">Product Categories</h2>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="New category name..."
              className="flex-1 px-3 py-2.5 bg-ground border border-rule text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              onClick={addCategory}
              disabled={!newCategory.trim()}
              className="px-4 py-2.5 bg-accent text-ground text-sm font-semibold hover:bg-ink transition-colors disabled:opacity-40"
            >
              Add
            </button>
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-secondary">No categories yet. Add one above.</p>
          ) : (
            <div className="space-y-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-ground/50 transition-colors"
                >
                  <span className="text-sm text-ink">{cat.name}</span>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-xs text-secondary hover:text-danger transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* In-app Notifications */}
      <div className="bg-ground border border-rule p-6">
        <h2 className="font-display text-lg font-black text-ink mb-4">In-app Notifications</h2>
        <p className="text-xs text-secondary mb-4">
          Alerts appear inside Aide&apos;s notification centre — no browser push permission needed, and they work offline.
        </p>
        <div className="space-y-3">
          <ToggleRow
            label="Enable in-app notifications"
            desc="Show alerts in the notification bell"
            value={notifEnabled}
            onChange={setNotifEnabled}
          />
          <div className="my-3 border-t border-rule" />
          {NOTIFICATION_CATEGORIES.map((cat) => (
            <ToggleRow
              key={cat.type}
              label={cat.label}
              desc={cat.hint}
              value={notifCats[cat.type] ?? true}
              onChange={(v) => setNotifCat(cat.type, v)}
            />
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-ground border border-danger/20 p-6">
        <h2 className="text-lg font-bold text-danger font-display mb-2">Danger Zone</h2>
        <p className="text-xs text-secondary mb-4">These actions cannot be undone.</p>
        <div className="flex gap-3">
          <button
            onClick={exportData}
            className="px-4 py-2 border border-danger/30 text-danger text-xs font-medium hover:bg-danger/10 transition-colors"
          >
            Export All Data
          </button>
          <button className="px-4 py-2 border border-danger/30 text-danger text-xs font-medium hover:bg-danger/10 transition-colors">
            Delete Business
          </button>
        </div>
      </div>
    </div>
  );
}
