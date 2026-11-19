"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/format";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useSession } from "next-auth/react";
import { Plus, X, Clock, CheckCircle, AlertCircle } from "lucide-react";

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

  if (loading) return <div className="text-secondary">Loading shifts...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Cashier Shifts</h1>
          <p className="text-secondary text-sm mt-1">
            Track cash drawer opening, closing, and reconciliation
          </p>
        </div>
        <button
          onClick={() => setShowOpenModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Open Shift
        </button>
      </div>

      {/* Active Shift */}
      {openShifts.length > 0 && (
        <div className="mb-6 p-4 rounded-lg border-2 border-accent/30 bg-accent/5">
          <h2 className="font-semibold text-ink flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-accent" />
            Active Shift
          </h2>
          {openShifts.map((shift) => (
            <div key={shift.id} className="flex items-center justify-between">
              <div>
                <span className="font-mono text-sm text-secondary">{shift.shiftNo}</span>
                <span className="ml-2 text-sm text-secondary">
                  Opened {new Date(shift.openedAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => { setShowCloseModal(shift); setCashCount(""); }}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                Close Shift
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Closed Shifts */}
      <h2 className="font-semibold text-ink mb-3">Closed Shifts</h2>
      <div className="space-y-3">
        {closedShifts.length === 0 && (
          <div className="text-center py-12 text-secondary">
            No closed shifts yet.
          </div>
        )}
        {closedShifts.map((shift) => {
          const diff = Number(shift.cashDifference);
          return (
            <div
              key={shift.id}
              className="p-4 rounded-lg border border-rule bg-surface"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{shift.shiftNo}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Closed
                    </span>
                  </div>
                  <div className="text-sm text-secondary mt-1">
                    {shift.cashier?.name || "Cashier"} · Opened{" "}
                    {new Date(shift.openedAt).toLocaleString()}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm">
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
                        <span className={`font-mono font-semibold ${diff < 0 ? "text-red-500" : "text-green-500"}`}>
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

      {/* Open Shift Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-ground rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="text-lg font-bold text-ink">Open Shift</h2>
              <button onClick={() => setShowOpenModal(false)} className="p-1 hover:bg-surface rounded">
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>
            <form onSubmit={openShift} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Opening Cash</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowOpenModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-rule text-ink hover:bg-surface transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors">
                  Open Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-ground rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="text-lg font-bold text-ink">Close Shift</h2>
              <button onClick={() => setShowCloseModal(null)} className="p-1 hover:bg-surface rounded">
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>
            <form onSubmit={closeShift} className="p-4 space-y-4">
              <div className="text-sm text-secondary">
                <span className="font-semibold text-ink">{showCloseModal.shiftNo}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Cash Count <span className="text-secondary font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashCount}
                  onChange={(e) => setCashCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-rule bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="Count the cash in the drawer"
                />
                <p className="text-xs text-secondary mt-1">
                  Leave empty to close without reconciliation
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCloseModal(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-rule text-ink hover:bg-surface transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
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
