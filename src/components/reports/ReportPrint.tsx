"use client";

import { createRoot } from "react-dom/client";
import { formatMoney, formatDate } from "@/lib/format";

interface ReportSale {
  id: string;
  total: number;
  cost: number;
  profit: number;
  paid: number;
  change: number;
  paymentMethod: string;
  items: { name: string; quantity: number; price: number; cost: number }[];
  createdAt: string;
  cashier?: string;
}

interface ReportData {
  sales: ReportSale[];
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalTransactions: number;
  avgSale: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  paymentBreakdown: { method: string; count: number; total: number }[];
  dateRange: string;
}

function ReportDocument({ data, businessName }: { data: ReportData; businessName: string }) {
  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", color: "#1a1a1a", maxWidth: 800, margin: "0 auto", padding: "40px 32px" }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: "2px solid #e0e0e0", paddingBottom: 24, marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>{businessName}</h1>
        <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>Sales Report</p>
        <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>{data.dateRange}</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Revenue", value: formatMoney(data.totalRevenue), color: "#1a1a1a" },
          { label: "Cost", value: formatMoney(data.totalCost), color: "#666" },
          { label: "Profit", value: formatMoney(data.totalProfit), color: "#16a34a" },
          { label: "Transactions", value: String(data.totalTransactions), color: "#1a1a1a" },
        ].map((item) => (
          <div key={item.label} style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 32 }}>
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 4 }}>Average Sale</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{formatMoney(data.avgSale)}</div>
        </div>
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 4 }}>Profit Margin</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {data.totalRevenue > 0 ? Math.round((data.totalProfit / data.totalRevenue) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Top Products */}
      {data.topProducts.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Top Products</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>#</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Product</th>
                <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Qty</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((p, i) => (
                <tr key={p.name} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "8px 12px", color: "#999" }}>{i + 1}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>{p.name}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>{p.quantity}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{formatMoney(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Breakdown */}
      {data.paymentBreakdown.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Payment Methods</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Method</th>
                <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Transactions</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Total</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>% Share</th>
              </tr>
            </thead>
            <tbody>
              {data.paymentBreakdown.map((p) => (
                <tr key={p.method} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>{p.method}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>{p.count}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{formatMoney(p.total)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                    {data.totalRevenue > 0 ? Math.round((p.total / data.totalRevenue) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sales Table */}
      {data.sales.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>All Transactions ({data.sales.length})</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Date</th>
                <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Method</th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Total</th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Profit</th>
                <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Items</th>
              </tr>
            </thead>
            <tbody>
              {data.sales.map((sale) => (
                <tr key={sale.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ padding: "6px 8px" }}>{formatDate(sale.createdAt, { hour: undefined, minute: undefined })}</td>
                  <td style={{ padding: "6px 8px" }}>{sale.paymentMethod}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{formatMoney(sale.total)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: "#16a34a" }}>{formatMoney(sale.profit)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{sale.items?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: "2px solid #e0e0e0", paddingTop: 20, marginTop: 32, textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "#999" }}>Generated on {formatDate(new Date())}</p>
        <p style={{ fontSize: 10, color: "#bbb", marginTop: 4 }}>Aide — Smart Business Management</p>
      </div>
    </div>
  );
}

export function printReport(data: ReportData, businessName: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;

  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sales Report — ${businessName}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: white; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div id="report-root"></div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `);
  w.document.close();

  const rootEl = w.document.getElementById("report-root");
  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<ReportDocument data={data} businessName={businessName} />);
  }
}
