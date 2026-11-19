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

  const statusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "APPROVED": case "COMPLETED": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "REJECTED": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) return <div className="text-secondary">Loading refunds...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Refunds</h1>
          <p className="text-secondary text-sm mt-1">
            {refunds.length} refunds · {formatMoney(refunds.reduce((s, r) => s + Number(r.refundedTotal), 0), business?.currency)} refunded
          </p>
        </div>
        <a
          href="/dashboard/sales"
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
        >
          Create Refund from Sales
        </a>
      </div>

      <div className="space-y-3">
        {refunds.length === 0 && (
          <div className="text-center py-12 text-secondary">
            No refunds yet.
          </div>
        )}
        {refunds.map((refund) => (
          <div
            key={refund.id}
            className="p-4 rounded-lg border border-rule bg-surface"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{refund.refundNo}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor(refund.status)}`}>
                    {refund.status}
                  </span>
                </div>
                <div className="text-sm text-secondary mt-1">
                  {refund.reason} · {new Date(refund.createdAt).toLocaleString()}
                </div>
                {refund.notes && (
                  <div className="text-sm text-secondary mt-1 italic">{refund.notes}</div>
                )}
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold text-red-500">
                  -{formatMoney(refund.refundedTotal, business?.currency)}
                </div>
                <div className="text-xs text-secondary">
                  Tax: {formatMoney(refund.refundedTax, business?.currency)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
