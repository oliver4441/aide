"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface Organization {
  id: string;
  name: string;
  legalName: string;
  slug: string;
  baseCurrency: string;
  status: string;
  createdAt: string;
  businesses: Business[];
  departments: Department[];
  stockLocations: StockLocation[];
  terminals: Terminal[];
  cashDrawers: CashDrawer[];
}

interface Business {
  id: string;
  name: string;
  slug: string;
  type: string;
  currency: string;
  taxRate: number;
  status: string;
  createdAt: string;
}

interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
}

interface StockLocation {
  id: string;
  code: string;
  name: string;
  type: string;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  createdAt: string;
}

interface Terminal {
  id: string;
  code: string;
  name: string;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  locationId: string | null;
  location: { id: string; name: string } | null;
  createdAt: string;
}

interface CashDrawer {
  id: string;
  code: string;
  name: string;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  terminalId: string | null;
  terminal: { id: string; name: string } | null;
  createdAt: string;
}

type Tab = "overview" | "departments" | "locations" | "terminals" | "drawers";

export default function OrganizationPageInner() {
  const { data: session } = useSession();
  const { data: business } = useBusinessSettings();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchOrg = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/organization");
      if (res.ok) {
        const data = await res.json();
        setOrg(data);
      } else {
        setError("Failed to load organization");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          legalName: formData.get("legalName"),
          baseCurrency: formData.get("baseCurrency"),
          status: formData.get("status"),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to save");
        return;
      }
      await fetchOrg();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.get("code"),
          name: formData.get("name"),
          description: formData.get("description"),
          parentId: formData.get("parentId") || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to create department");
        return;
      }
      (e.target as HTMLFormElement).reset();
      await fetchOrg();
    } catch {
      setError("Network error");
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/stock-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.get("code"),
          name: formData.get("name"),
          type: formData.get("type"),
          branchId: formData.get("branchId") || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to create location");
        return;
      }
      (e.target as HTMLFormElement).reset();
      await fetchOrg();
    } catch {
      setError("Network error");
    }
  };

  const handleCreateTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/terminals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.get("code"),
          name: formData.get("name"),
          branchId: formData.get("branchId") || null,
          locationId: formData.get("locationId") || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to create terminal");
        return;
      }
      (e.target as HTMLFormElement).reset();
      await fetchOrg();
    } catch {
      setError("Network error");
    }
  };

  const handleCreateDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/cash-drawers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.get("code"),
          name: formData.get("name"),
          branchId: formData.get("branchId") || null,
          terminalId: formData.get("terminalId") || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to create cash drawer");
        return;
      }
      (e.target as HTMLFormElement).reset();
      await fetchOrg();
    } catch {
      setError("Network error");
    }
  };

  const deleteItem = async (type: string, id: string) => {
    if (!confirm(`Delete this ${type}?`)) return;
    setError("");
    try {
      const res = await fetch(`/api/${type}s/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || `Failed to delete ${type}`);
        return;
      }
      await fetchOrg();
    } catch {
      setError("Network error");
    }
  };

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

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "departments", label: "Departments" },
    { key: "locations", label: "Stock Locations" },
    { key: "terminals", label: "Terminals" },
    { key: "drawers", label: "Cash Drawers" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-rule pb-6">
        <div>
          <p className="np-kicker mb-1">Settings</p>
          <h1 className="font-display text-2xl md:text-3xl font-black text-ink mb-1">
            Organization Hierarchy
          </h1>
          <p className="font-display text-sm text-secondary">
            Manage organization, branches, departments, warehouses, terminals and cash drawers
          </p>
        </div>
      </div>

      {error && (
        <div className="border border-danger bg-danger/10 text-danger p-3 text-sm font-display">
          {error}
        </div>
      )}

      {/* Tabs */}
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

      {/* Overview Tab */}
      {tab === "overview" && org && (
        <div className="space-y-6">
          {/* Organization Form */}
          <div className="border border-rule p-6 bg-ground">
            <h2 className="font-display text-lg font-black text-ink mb-4">Organization Details</h2>
            <form onSubmit={handleSaveOrg} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="np-kicker">Organization Name</label>
                  <input
                    name="name"
                    defaultValue={org.name}
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="np-kicker">Legal Name</label>
                  <input
                    name="legalName"
                    defaultValue={org.legalName}
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="np-kicker">Base Currency</label>
                  <select
                    name="baseCurrency"
                    defaultValue={org.baseCurrency}
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  >
                    <option value="KES">KES - Kenyan Shilling</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>
                <div>
                  <label className="np-kicker">Status</label>
                  <select
                    name="status"
                    defaultValue={org.status}
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 border-t border-rule">
                <button type="submit" disabled={saving} className="np-btn np-btn--accent">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>

          {/* Branches (Businesses) */}
          <div className="border border-rule p-6 bg-ground">
            <h2 className="font-display text-lg font-black text-ink mb-4">Branches (Businesses)</h2>
            {org.businesses.length === 0 ? (
              <p className="font-display text-sm text-secondary">No branches yet.</p>
            ) : (
              <div className="space-y-2">
                {org.businesses.map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3 border border-rule">
                    <div>
                      <div className="font-display text-sm font-black text-ink">{b.name}</div>
                      <div className="font-display text-xs text-secondary flex items-center gap-2">
                        <span>{b.type}</span>
                        <span className="text-rule">·</span>
                        <span>{b.currency}</span>
                        <span className="text-rule">·</span>
                        <span>Tax: {b.taxRate}%</span>
                      </div>
                    </div>
                    <span className="font-display text-xs font-black uppercase tracking-wider text-secondary">
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary Counts */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <SummaryCard label="Departments" value={org.departments.length} />
            <SummaryCard label="Stock Locations" value={org.stockLocations.length} />
            <SummaryCard label="Terminals" value={org.terminals.length} />
            <SummaryCard label="Cash Drawers" value={org.cashDrawers.length} />
            <SummaryCard label="Branches" value={org.businesses.length} />
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {tab === "departments" && org && (
        <div className="space-y-6">
          {/* Create Form */}
          <div className="border border-rule p-6 bg-ground">
            <h2 className="font-display text-lg font-black text-ink mb-4">Add Department</h2>
            <form onSubmit={handleCreateDepartment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="np-kicker">Code</label>
                  <input
                    name="code"
                    required
                    placeholder="DEPT01"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="np-kicker">Name</label>
                  <input
                    name="name"
                    required
                    placeholder="Finance"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="np-kicker">Parent Department</label>
                  <select
                    name="parentId"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  >
                    <option value="">— None (Top Level) —</option>
                    {org.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="np-kicker">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                />
              </div>
              <button type="submit" className="np-btn np-btn--accent">Add Department</button>
            </form>
          </div>

          {/* Department List */}
          <div className="border border-rule overflow-hidden bg-ground">
            <table className="w-full font-display text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Code</th>
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Name</th>
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Parent</th>
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Description</th>
                  <th className="text-right p-3 text-ink font-black uppercase tracking-wider text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {org.departments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-secondary">
                      No departments yet. Add one above.
                    </td>
                  </tr>
                )}
                {org.departments.map((d) => {
                  const parent = org.departments.find((p) => p.id === d.parentId);
                  return (
                    <tr key={d.id} className="border-b border-rule last:border-b-0">
                      <td className="p-3 font-mono font-black text-ink">{d.code}</td>
                      <td className="p-3 font-black text-ink">{d.name}</td>
                      <td className="p-3 text-secondary">{parent ? `${parent.code} — ${parent.name}` : "—"}</td>
                      <td className="p-3 text-secondary">{d.description || "—"}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => deleteItem("department", d.id)}
                          className="text-xs font-display font-black text-danger hover:text-error"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Locations Tab */}
      {tab === "locations" && org && (
        <div className="space-y-6">
          <div className="border border-rule p-6 bg-ground">
            <h2 className="font-display text-lg font-black text-ink mb-4">Add Stock Location</h2>
            <form onSubmit={handleCreateLocation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="np-kicker">Code</label>
                  <input
                    name="code"
                    required
                    placeholder="WH01"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="np-kicker">Name</label>
                  <input
                    name="name"
                    required
                    placeholder="Main Warehouse"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="np-kicker">Type</label>
                  <select
                    name="type"
                    required
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  >
                    <option value="WAREHOUSE">Warehouse</option>
                    <option value="STOCK_ROOM">Stock Room</option>
                    <option value="SHOP_FLOOR">Shop Floor</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="np-kicker">Branch</label>
                  <select
                    name="branchId"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  >
                    <option value="">— No Branch —</option>
                    {org.businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="np-btn np-btn--accent">Add Location</button>
            </form>
          </div>

          <div className="border border-rule overflow-hidden bg-ground">
            <table className="w-full font-display text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Code</th>
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Name</th>
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Type</th>
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Branch</th>
                  <th className="text-right p-3 text-ink font-black uppercase tracking-wider text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {org.stockLocations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-secondary">No stock locations yet.</td>
                  </tr>
                )}
                {org.stockLocations.map((l) => (
                  <tr key={l.id} className="border-b border-rule last:border-b-0">
                    <td className="p-3 font-mono font-black text-ink">{l.code}</td>
                    <td className="p-3 font-black text-ink">{l.name}</td>
                    <td className="p-3 text-secondary">{l.type}</td>
                    <td className="p-3 text-secondary">{l.branch?.name || "—"}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => deleteItem("stock-location", l.id)}
                        className="text-xs font-display font-black text-danger hover:text-error"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Terminals Tab */}
      {tab === "terminals" && org && (
        <div className="space-y-6">
          <div className="border border-rule p-6 bg-ground">
            <h2 className="font-display text-lg font-black text-ink mb-4">Add Terminal</h2>
            <form onSubmit={handleCreateTerminal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="np-kicker">Code</label>
                  <input
                    name="code"
                    required
                    placeholder="POS01"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="np-kicker">Name</label>
                  <input
                    name="name"
                    required
                    placeholder="Checkout 1"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="np-kicker">Branch</label>
                  <select
                    name="branchId"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  >
                    <option value="">— No Branch —</option>
                    {org.businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="np-kicker">Stock Location</label>
                  <select
                    name="locationId"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  >
                    <option value="">— None —</option>
                    {org.stockLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.code} — {l.name} {l.branch ? `(${l.branch.name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="np-btn np-btn--accent">Add Terminal</button>
            </form>
          </div>

          <div className="border border-rule overflow-hidden bg-ground">
            <table className="w-full font-display text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Code</th>
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Name</th>
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Branch</th>
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Stock Location</th>
                  <th className="text-right p-3 text-ink font-black uppercase tracking-wider text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {org.terminals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-secondary">No terminals yet.</td>
                  </tr>
                )}
                {org.terminals.map((t) => (
                  <tr key={t.id} className="border-b border-rule last:border-b-0">
                    <td className="p-3 font-mono font-black text-ink">{t.code}</td>
                    <td className="p-3 font-black text-ink">{t.name}</td>
                    <td className="p-3 text-secondary">{t.branch?.name || "—"}</td>
                    <td className="p-3 text-secondary">{t.location?.name || "—"}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => deleteItem("terminal", t.id)}
                        className="text-xs font-display font-black text-danger hover:text-error"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cash Drawers Tab */}
      {tab === "drawers" && org && (
        <div className="space-y-6">
          <div className="border border-rule p-6 bg-ground">
            <h2 className="font-display text-lg font-black text-ink mb-4">Add Cash Drawer</h2>
            <form onSubmit={handleCreateDrawer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="np-kicker">Code</label>
                  <input
                    name="code"
                    required
                    placeholder="DRW01"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="np-kicker">Name</label>
                  <input
                    name="name"
                    required
                    placeholder="Main Drawer"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="np-kicker">Branch</label>
                  <select
                    name="branchId"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  >
                    <option value="">— No Branch —</option>
                    {org.businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="np-kicker">Terminal</label>
                  <select
                    name="terminalId"
                    className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  >
                    <option value="">— None —</option>
                    {org.terminals.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} — {t.name} {t.branch ? `(${t.branch.name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="np-btn np-btn--accent">Add Cash Drawer</button>
            </form>
          </div>

          <div className="border border-rule overflow-hidden bg-ground">
            <table className="w-full font-display text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Code</th>
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Name</th>
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Branch</th>
                  <th className="text-left p-3 text-ink font-black uppercase tracking-wider text-xs">Terminal</th>
                  <th className="text-right p-3 text-ink font-black uppercase tracking-wider text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {org.cashDrawers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-secondary">No cash drawers yet.</td>
                  </tr>
                )}
                {org.cashDrawers.map((d) => (
                  <tr key={d.id} className="border-b border-rule last:border-b-0">
                    <td className="p-3 font-mono font-black text-ink">{d.code}</td>
                    <td className="p-3 font-black text-ink">{d.name}</td>
                    <td className="p-3 text-secondary">{d.branch?.name || "—"}</td>
                    <td className="p-3 text-secondary">{d.terminal?.name || "—"}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => deleteItem("cash-drawer", d.id)}
                        className="text-xs font-display font-black text-danger hover:text-error"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-rule p-5 bg-ground">
      <div className="font-display text-xs font-black uppercase tracking-wider text-secondary">{label}</div>
      <div className="font-display text-2xl font-black text-ink mt-1">{value}</div>
    </div>
  );
}