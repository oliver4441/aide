"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/format";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface Refund {
  id: string;
  refundNo: string;
  saleId: string;
  reason: string;
  status: string;
  refundedTotal: string | number;
  refundedTax: string | number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function RefundsPageInner() {
  const { data: business } = useBusinessSettings();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRefunds = useCallback(async () => {
    try {
      const res = await fetch("/api/refunds");
      if (res.ok) {
        const data = await res.json();
        setRefunds(data);
      }
    } catch (err) {
      console.error("Failed to fetch refunds:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const statusLabel = (status: string) => {
    switch (status) {
      case "PENDING": return <span className="font-display text-xs font-black uppercase tracking-wider text-warning">Pending</span>;
      case "APPROVED": case "COMPLETED": return <span className="font-display text-xs font-black uppercase tracking-wider text-success">Completed</span>;
      case "REJECTED": return <span className="font-display text-xs font-black uppercase tracking-wider text-accent">Rejected</span>;
      default: return <span className="font-display text-xs font-black uppercase tracking-wider text-secondary">{status}</span>;
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

  const totalRefunded = refunds.reduce((s, r) => s + Number(r.refundedTotal), 0);

  return (
    <div className="space-y-8">
      {/* Header — ruled */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-rule pb-6">
        <div>
          <p className="np-kicker mb-1">Operations</p>
          <h1 className="font-display text-2xl md:text-3xl font-black text-ink mb-1">
            Refunds
          </h1>
          <p className="font-display text-sm text-secondary">
            {refunds.length} refund{refunds.length !== 1 ? "s" : ""} · {formatMoney(totalRefunded, business?.currency)} refunded
          </p>
        </div>
        <a
          href="/dashboard/sales"
          className="np-btn"
        >
          Create Refund from Sales
        </a>
      </div>

      {/* Refund List — ruled rows */}
      {refunds.length === 0 && (
        <div className="border border-rule p-8 text-center">
          <p className="font-display text-sm text-secondary">No refunds yet.</p>
        </div>
      )}
      <div className="space-y-0">
        {refunds.map((refund) => (
          <div
            key={refund.id}
            className="flex items-start justify-between border-b border-rule px-4 py-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-sm font-black text-ink">{refund.refundNo}</span>
                {statusLabel(refund.status)}
              </div>
              <div className="font-display text-sm text-secondary mt-1">
                {refund.reason} · {new Date(refund.createdAt).toLocaleString()}
              </div>
              {refund.notes && (
                <div className="font-display text-sm text-secondary mt-1 italic">{refund.notes}</div>
              )}
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="font-mono font-black text-accent">
                -{formatMoney(refund.refundedTotal, business?.currency)}
              </div>
              <div className="font-display text-xs text-secondary">
                Tax: {formatMoney(refund.refundedTax, business?.currency)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
