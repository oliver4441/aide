"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import db from "@/lib/db";

const TYPES = ["GENERAL SHOP", "GROCERY", "SALON", "RESTAURANT", "PHARMACY", "ELECTRONICS", "CLOTHING", "OTHER"];

export default function BusinessGate() {
  const { data: session, status } = useSession();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("OTHER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    if ((session?.user as any)?.role === "admin") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/business");
        const data = await res.json();
        if (!cancelled && !data.business) setShow(true);
      } catch {
        // offline or failed — don't block the app
      }
    })();
    return () => { cancelled = true; };
  }, [status, session]);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      localStorage.setItem("aide_business_id", data.business.id);
      await db.businesses.put({ ...data.business, syncStatus: "synced" });
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Could not create business");
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-outline-variant p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.jpg" alt="" className="w-10 h-10 rounded-xl object-cover" />
          <div>
            <h2 className="text-lg font-bold text-on-surface font-headline">Name your business</h2>
            <p className="text-xs text-on-surface-variant">This creates your own private workspace</p>
          </div>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-on-surface mb-1.5">Business name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mama Njeri Store"
          autoFocus
          className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
        />

        <label className="block text-sm font-medium text-on-surface mb-1.5">Business type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 mb-6"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
          ))}
        </select>

        <button
          onClick={create}
          disabled={!name.trim() || saving}
          className="w-full bg-primary text-on-primary font-semibold py-3 rounded-xl hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Creating..." : "Create My Business"}
        </button>
      </div>
    </div>
  );
}
