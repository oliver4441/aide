"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReceiptDocument from "@/components/receipt/ReceiptDocument";
import db, { BusinessRecord } from "@/lib/db";

interface SaleData {
  id: string;
  total: number;
  paid: number;
  change: number;
  taxRate: number;
  paymentMethod: string;
  cashier?: string | null;
  createdAt: string;
  items: { id: string; name: string; quantity: number; price: number; cost: number }[];
  business: {
    name: string;
    type: string;
    currency: string;
    taxRate: number;
    receiptFooter: string | null;
  };
}

export default function SharedReceiptPage() {
  const params = useParams();
  const id = params?.id as string;
  const [sale, setSale] = useState<SaleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/receipts/${id}`);
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        setSale(data.sale);
      } catch {
        // Offline fallback — read the receipt from local IndexedDB
        try {
          const local = await db.sales.get(id);
          if (!local) throw new Error("local missing");
          const items = await db.saleItems.where("saleId").equals(id).toArray();
          let business: BusinessRecord | undefined;
          try {
            business = await db.businesses.get(local.businessId);
          } catch {}
          setSale({
            id: local.id,
            total: local.total,
            paid: local.paid,
            change: local.change,
            taxRate: local.taxRate,
            paymentMethod: local.paymentMethod,
            cashier: local.cashier,
            createdAt: local.createdAt,
            items: items.map((i) => ({
              id: i.id,
              name: i.name,
              quantity: i.quantity,
              price: i.price,
              cost: i.cost,
            })),
            business: {
              name: business?.name || "Aide Business",
              type: business?.type || "",
              currency: business?.currency || "KSh",
              taxRate: business?.taxRate ?? local.taxRate ?? 16,
              receiptFooter: business?.receiptFooter || null,
            },
          });
        } catch {
          setError("Could not load receipt");
        }
      }
      setLoading(false);
    })();
  }, [id]);

  const share = async () => {
    if (!sale) return;
    const url = window.location.href;
    const text = `Receipt ${sale.id.slice(0, 8).toUpperCase()} — ${sale.business.name}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Your Receipt", text, url });
        setShared(true);
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-lg font-bold text-on-surface font-headline mb-6">
          Your Receipt
        </h1>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-error-container text-on-error-container rounded-xl px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}

        {sale && (
          <>
            <div className="rounded-xl border border-outline-variant overflow-hidden shadow-md">
              <ReceiptDocument
                sale={{
                  id: sale.id,
                  total: sale.total,
                  paid: sale.paid,
                  change: sale.change,
                  paymentMethod: sale.paymentMethod,
                  items: sale.items,
                  createdAt: sale.createdAt,
                  cashier: sale.cashier || undefined,
                }}
                business={{
                  ...sale.business,
                  receiptFooter: sale.business.receiptFooter || undefined,
                }}
              />
            </div>

            <button
              onClick={() => window.print()}
              className="w-full mt-5 bg-primary text-on-primary font-semibold py-3.5 rounded-xl shadow-md hover:bg-primary-light transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download / Save PDF
            </button>

            <button
              onClick={share}
              className="w-full mt-2.5 bg-surface-container border border-outline-variant text-on-surface font-semibold py-3.5 rounded-xl hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              {shared ? "Sent / Copied ✓" : "Share Receipt"}
            </button>

            <p className="text-center text-xs text-on-surface-variant mt-3">
              Tap &quot;Download / Save PDF&quot; and choose &quot;Save as PDF&quot; to keep your receipt.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
