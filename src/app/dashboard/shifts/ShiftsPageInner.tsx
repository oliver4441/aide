"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/format";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useSession } from "next-auth/react";

interface Shift {
  id: string;
  shiftNo: string;
  status: string;
  cashierId: string;
  cashierName?: string;
  cashier?: { name: string; email: string };
  openedAt: string;
  closedAt?: string;
  openingCash: string | number;
  closingCash?: string | number;
  expectedCash?: string | number;
  cashDifference?: string | number;
  totalSales: string | number;
  totalRefunds: string | number;
  totalTips: string | number;
  notes?: string;
}

export default function ShiftsPageInner() {
  const { data: business } = useBusinessSettings();
  const { data: session } = useSession();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState<Shift | null>(null);
  const [openingCash, setOpeningCash] = useState("0");
  const [cashCount, setCashCount] = useState("");

  const fetchShifts = useCallback(async () => {
    try {
      const res = await fetch("/api/shifts");
      if (res.ok) {
        const data = await res.json();
        setShifts(data);
      }
    } catch (err) {
      console.error("Failed to fetch shifts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const openShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingCash: Number(openingCash) }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to open shift");
        return;
      }
      setShowOpenModal(false);
      setOpeningCash("0");
      await fetchShifts();
    } catch (err) {
      console.error(err);
    }
  };

  const closeShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCloseModal) return;
    try {
      const res = await fetch(`/api/shifts/${showCloseModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cashCount: cashCount ? Number(cashCount) : null }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to close shift");
        return;
      }
      setShowCloseModal(null);
      setCashCount("");
      await fetchShifts();
    } catch (err) {
      console.error(err);
    }
  };

  const openShifts = shifts.filter((s) => s.status === "OPEN");
  const closedShifts = shifts.filter((s) => s.status !== "OPEN");

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
          <p className="np-kicker mb-1">Operations</p>
          <h1 className="font-display text-2xl md:text-3xl font-black text-ink mb-1">
            Cashier Shifts
          </h1>
          <p className="font-display text-sm text-secondary">
            Track cash drawer opening, closing, and reconciliation
          </p>
        </div>
        <button
          onClick={() => setShowOpenModal(true)}
          className="np-btn"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Open Shift
        </button>
      </div>

      {/* Active Shift */}
      {openShifts.length > 0 && (
        <div className="border-2 border-accent p-4">
          <h2 className="font-display text-xs font-black uppercase tracking-wider text-accent mb-3">
            Active Shift
          </h2>
          {openShifts.map((shift) => (
            <div key={shift.id} className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-display text-sm text-secondary">
                <span className="font-mono font-black text-ink">{shift.shiftNo}</span>
                {" — Opened "}
                {new Date(shift.openedAt).toLocaleString()}
              </div>
              <button
                onClick={() => { setShowCloseModal(shift); setCashCount(""); }}
                className="np-btn np-btn--accent"
              >
                Close Shift
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Closed Shifts */}
      <div>
        <h2 className="font-display text-xs font-black uppercase tracking-wider text-secondary mb-3">
          Closed Shifts
        </h2>
        {closedShifts.length === 0 && (
          <div className="border border-rule p-8 text-center">
            <p className="font-display text-sm text-secondary">No closed shifts yet.</p>
          </div>
        )}
        <div className="space-y-0">
          {closedShifts.map((shift) => {
            const diff = Number(shift.cashDifference);
            return (
              <div
                key={shift.id}
                className="border-b border-rule px-4 py-4"
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-sm font-black text-ink">{shift.shiftNo}</span>
                      <span className="font-display text-xs font-black uppercase tracking-wider text-secondary">
                        Closed
                      </span>
                    </div>
                    <div className="font-display text-sm text-secondary mt-1">
                      {shift.cashier?.name || "Cashier"} · Opened {new Date(shift.openedAt).toLocaleString()}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 font-display text-sm">
                      <span className="text-secondary">Opening Cash:</span>
                      <span className="text-ink font-mono">
                        {formatMoney(shift.openingCash, business?.currency)}
                      </span>
                      <span className="text-secondary">Total Sales:</span>
                      <span className="text-ink font-mono">
                        {formatMoney(shift.totalSales, business?.currency)}
                      </span>
                      <span className="text-secondary">Tips:</span>
                      <span className="text-ink font-mono">
                        {formatMoney(shift.totalTips, business?.currency)}
                      </span>
                      {shift.expectedCash !== undefined && (
                        <>
                          <span className="text-secondary">Expected Cash:</span>
                          <span className="text-ink font-mono">
                            {formatMoney(shift.expectedCash, business?.currency)}
                          </span>
                        </>
                      )}
                      {shift.closingCash !== undefined && (
                        <>
                          <span className="text-secondary">Cash Count:</span>
                          <span className="text-ink font-mono">
                            {formatMoney(shift.closingCash, business?.currency)}
                          </span>
                        </>
                      )}
                      {diff !== 0 && (
                        <>
                          <span className="text-secondary">Difference:</span>
                          <span className={`font-mono font-black ${diff < 0 ? "text-accent" : "text-success"}`}>
                            {formatMoney(diff, business?.currency)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Open Shift Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="bg-ground border border-ink w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="font-display text-lg font-black text-ink">Open Shift</h2>
              <button onClick={() => setShowOpenModal(false)} className="p-1 text-secondary hover:text-ink">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={openShift} className="p-4 space-y-4">
              <div>
                <label className="np-kicker">Opening Cash</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowOpenModal(false)} className="np-btn flex-1">
                  Cancel
                </button>
                <button type="submit" className="np-btn flex-1 np-btn--accent">
                  Open Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="bg-ground border border-ink w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="font-display text-lg font-black text-ink">Close Shift</h2>
              <button onClick={() => setShowCloseModal(null)} className="p-1 text-secondary hover:text-ink">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={closeShift} className="p-4 space-y-4">
              <div className="font-display text-sm text-secondary border-b border-rule pb-3">
                <span className="font-black text-ink">{showCloseModal.shiftNo}</span>
              </div>
              <div>
                <label className="np-kicker">
                  Cash Count <span className="font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashCount}
                  onChange={(e) => setCashCount(e.target.value)}
                  className="w-full px-3 py-2 border border-rule bg-ground text-ink font-display text-control focus:outline-none mt-1"
                  placeholder="Count the cash in the drawer"
                />
                <p className="font-display text-xs text-secondary mt-1">
                  Leave empty to close without reconciliation
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCloseModal(null)} className="np-btn flex-1">
                  Cancel
                </button>
                <button type="submit" className="np-btn flex-1 np-btn--accent">
                  Close Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
