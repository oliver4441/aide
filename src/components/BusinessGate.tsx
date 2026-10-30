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
      } catch {}
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/50 p-4">
      <div className="bg-ground border border-rule w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="font-display text-2xl font-black text-ink">Aide</span>
          <div>
            <h2 className="font-display text-lg font-black text-ink">Name your business</h2>
            <p className="text-xs text-secondary">This creates your own private workspace</p>
          </div>
        </div>

        {error && (
          <div className="border-b border-danger pb-2 mb-4 text-sm text-danger font-display">
            {error}
          </div>
        )}

        <label className="block text-xs font-black text-secondary mb-1">Business name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mama Njeri Store"
          autoFocus
          className="w-full px-4 py-3 border-b border-rule bg-transparent text-ink focus:outline-none focus:border-ink mb-4 font-reading"
        />

        <label className="block text-xs font-black text-secondary mb-1">Business type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-4 py-3 border-b border-rule bg-transparent text-ink focus:outline-none focus:border-ink mb-6 font-reading"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
          ))}
        </select>

        <button
          onClick={create}
          disabled={!name.trim() || saving}
          className="np-btn np-btn--accent w-full py-3 font-display font-black"
        >
          {saving ? "Creating..." : "Create My Business"}
        </button>
      </div>
    </div>
  );
}
