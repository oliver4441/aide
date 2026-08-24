"use client";

import { createRoot } from "react-dom/client";
import ReceiptDocument from "./ReceiptDocument";

interface PrintSale {
  id: string;
  total: number;
  cost?: number;
  profit?: number;
  paid: number;
  change: number;
  paymentMethod: string;
  items: { id?: string; name: string; quantity: number; price: number; cost?: number }[];
  createdAt: string | Date;
  cashier?: string;
}

interface PrintBusiness {
  name: string;
  type?: string;
  currency?: string;
  taxRate?: number;
  receiptFooter?: string;
}

export function printReceipt(sale: PrintSale, business: PrintBusiness) {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;

  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${sale.id.slice(0, 8).toUpperCase()}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 11px;
          line-height: 1.4;
          width: 80mm;
          padding: 4mm;
          background: white;
          color: #000;
        }
        @media print {
          @page { size: 80mm auto; margin: 2mm; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div id="receipt-root"></div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `);
  w.document.close();

  const rootEl = w.document.getElementById("receipt-root");
  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(
      <ReceiptDocument sale={sale} business={business} />
    );
  }
}

export function PrintButton({
  sale,
  business,
  className = "",
}: {
  sale: PrintSale;
  business: PrintBusiness;
  className?: string;
}) {
  return (
    <button
      onClick={() => printReceipt(sale, business)}
      className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${className}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      Print
    </button>
  );
}
