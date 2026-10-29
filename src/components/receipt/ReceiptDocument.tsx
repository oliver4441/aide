"use client";

import { formatMoney, formatDate } from "@/lib/format";
import ReceiptQR from "./ReceiptQR";

interface ReceiptItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  cost?: number;
  imageUrl?: string;
}

interface ReceiptSale {
  id: string;
  total: number;
  cost?: number;
  profit?: number;
  paid: number;
  change: number;
  paymentMethod: string;
  items: ReceiptItem[];
  createdAt: string | Date;
  cashier?: string;
}

interface ReceiptBusiness {
  name: string;
  type?: string;
  currency?: string;
  taxRate?: number;
  receiptFooter?: string;
}

export default function ReceiptDocument({
  sale,
  business,
  shareUrl,
}: {
  sale: ReceiptSale;
  business: ReceiptBusiness;
  shareUrl?: string;
}) {
  const currency = business.currency || "KSh";
  const taxRate = business.taxRate ?? 16;
  const subtotal = sale.total;
  const vatAmount = subtotal - subtotal / (1 + taxRate / 100);

  return (
    <div className="receipt-root font-mono text-ink bg-ground">
      <style>{`
        @media print {
          .receipt-root {
            all: initial;
            display: block !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            color: #000 !important;
            font-family: 'Courier New', monospace !important;
            font-size: 11px !important;
            line-height: 1.4 !important;
          }
          .receipt-root * { color: #000 !important; background: transparent !important; }
          .receipt-image { display: none !important; }
          .no-print { display: none !important; }
          .np-receipt-rule { border-bottom: 1px solid #000 !important; }
          @page { size: 80mm auto; margin: 2mm; }
        }
      `}</style>

      {/* Header — ruled */}
      <div className="text-center border-b border-rule pb-3 mb-3 np-section-rule">
        <div className="text-base font-black tracking-wide">{business.name}</div>
        <div className="text-[10px] text-secondary mt-1">Receipt</div>
      </div>

      {/* Meta */}
      <div className="space-y-0.5 text-[10px] text-secondary mb-3">
        <div className="flex justify-between">
          <span>Receipt #</span>
          <span className="font-black text-ink">{sale.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{formatDate(sale.createdAt, { hour: undefined, minute: undefined })}</span>
        </div>
        <div className="flex justify-between">
          <span>Time</span>
          <span>{formatDate(sale.createdAt, { day: undefined, month: undefined, year: undefined })}</span>
        </div>
        {sale.cashier && (
          <div className="flex justify-between">
            <span>Cashier</span>
            <span>{sale.cashier}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="border-t border-rule pt-2 mb-2">
        <div className="text-[10px] font-black text-secondary uppercase tracking-wider mb-1">Items</div>
        <div className="space-y-1">
          {sale.items.map((item, i) => (
            <div key={item.id || i} className="text-[10px]">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-8 h-8 object-cover flex-shrink-0 receipt-image border border-rule"
                    />
                  )}
                  <span className="text-ink truncate">
                    {item.name}
                  </span>
                </div>
                <span className="text-secondary flex-shrink-0">{item.quantity} × {formatMoney(item.price, currency)}</span>
              </div>
              <div className="flex justify-between text-right">
                <span></span>
                <span className="font-black text-ink">{formatMoney(item.price * item.quantity, currency)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals — ruled */}
      <div className="np-section-rule pt-2 space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-secondary">Subtotal</span>
          <span className="text-ink">{formatMoney(subtotal, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary">VAT @{taxRate}%</span>
          <span className="text-ink">{formatMoney(vatAmount, currency)}</span>
        </div>
        <div className="flex justify-between text-xs font-black border-t border-rule pt-1 mt-1">
          <span className="text-ink">TOTAL</span>
          <span className="text-ink">{formatMoney(subtotal, currency)}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="border-t border-rule pt-2 mt-2 space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-secondary">Paid ({sale.paymentMethod})</span>
          <span className="text-ink">{formatMoney(sale.paid, currency)}</span>
        </div>
        {sale.change > 0 && (
          <div className="flex justify-between">
            <span className="text-secondary">Change</span>
            <span className="font-black text-ink">{formatMoney(sale.change, currency)}</span>
          </div>
        )}
      </div>

      {/* QR — customer scans to get receipt on their phone */}
      <div className="print:hidden flex flex-col items-center pt-2 mt-2 border-t border-rule">
        {typeof window !== "undefined" && (
          <ReceiptQR
            url={shareUrl ?? `${window.location.origin}/r/${sale.id}`}
            size={80}
          />
        )}
        <span className="text-[8px] text-secondary mt-1">Scan to save your receipt</span>
      </div>

      {/* Footer */}
      {business.receiptFooter && (
        <div className="border-t border-rule pt-2 mt-3 text-center text-[9px] text-secondary">
          {business.receiptFooter}
        </div>
      )}

      <div className="text-center text-[8px] text-secondary mt-2">
        Thank you for your purchase!
      </div>
    </div>
  );
}
