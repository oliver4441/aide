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
    <div style={{ fontFamily: "'Georgia', serif", color: "#191916", maxWidth: 800, margin: "0 auto", padding: "40px 32px" }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm 15mm; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { background: #f3efe5; }
        .np-report-rule { border-bottom: 4px solid #191916; margin: 22px 0; }
        .np-report-hairline { border-bottom: 1px solid #9b978e; }
        .np-report-table th {
          font-family: 'Georgia', serif;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #494843;
          padding: 8px 12px;
          text-align: left;
          border-bottom: 2px solid #9b978e;
        }
        .np-report-table td {
          font-family: 'Georgia', serif;
          font-size: 12px;
          padding: 8px 12px;
          border-bottom: 1px solid #d4d0c8;
        }
        .np-report-table tbody tr:last-child td { border-bottom: none; }
        .np-report-card {
          border: 1px solid #9b978e;
          padding: 16px;
          background: #f3efe5;
        }
        .np-report-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #494843;
          margin-bottom: 4px;
        }
        .np-report-value {
          font-size: 20px;
          font-weight: 700;
          color: #191916;
        }
        .np-report-profit { color: #10b981; }
        .np-report-accent { color: #a3231d; }
      `}</style>

      {/* Header — ruled */}
      <div style={{ textAlign: "center", paddingBottom: 24, marginBottom: 32 }}>
        <div className="np-report-rule" />
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: "12px 0 4px", letterSpacing: "-0.02em" }}>{businessName}</h1>
        <p style={{ fontSize: 13, color: "#494843", marginTop: 6, fontStyle: "italic" }}>Sales Report</p>
        <p style={{ fontSize: 12, color: "#9b978e", marginTop: 4 }}>{data.dateRange}</p>
        <div className="np-report-rule" style={{ marginTop: 24 }} />
      </div>

      {/* Summary Cards — ruled blocks */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Revenue", value: formatMoney(data.totalRevenue), className: "np-report-value" },
          { label: "Cost", value: formatMoney(data.totalCost), className: "np-report-value" },
          { label: "Profit", value: formatMoney(data.totalProfit), className: "np-report-value np-report-profit" },
          { label: "Transactions", value: String(data.totalTransactions), className: "np-report-value" },
        ].map((item) => (
          <div key={item.label} className="np-report-card">
            <div className="np-report-label">aideReport</div>
            <div className={item.className}>{item.value}</div>
            <div className="np-report-label" style={{ marginTop: 4 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 32 }}>
        <div className="np-report-card">
          <div className="np-report-label">Average Sale</div>
          <div className="np-report-value">{formatMoney(data.avgSale)}</div>
        </div>
        <div className="np-report-card">
          <div className="np-report-label">Profit Margin</div>
          <div className="np-report-value">
            {data.totalRevenue > 0 ? Math.round((data.totalProfit / data.totalRevenue) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Top Products */}
      {data.topProducts.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12, color: "#191916" }}>Top Products</h2>
          <table className="np-report-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>#</th>
                <th style={{ textAlign: "left" }}>Product</th>
                <th style={{ textAlign: "center" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((p, i) => (
                <tr key={p.name}>
                  <td style={{ color: "#9b978e" }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ textAlign: "center" }}>{p.quantity}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{formatMoney(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Breakdown */}
      {data.paymentBreakdown.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12, color: "#191916" }}>Payment Methods</h2>
          <table className="np-report-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Method</th>
                <th style={{ textAlign: "center" }}>Transactions</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th style={{ textAlign: "right" }}>% Share</th>
              </tr>
            </thead>
            <tbody>
              {data.paymentBreakdown.map((p) => (
                <tr key={p.method}>
                  <td style={{ fontWeight: 500 }}>{p.method}</td>
                  <td style={{ textAlign: "center" }}>{p.count}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{formatMoney(p.total)}</td>
                  <td style={{ textAlign: "right" }}>
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
          <div className="np-report-rule" />
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12, color: "#191916" }}>
            All Transactions ({data.sales.length})
          </h2>
          <table className="np-report-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Date</th>
                <th style={{ textAlign: "left" }}>Method</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th style={{ textAlign: "right" }} className="np-report-profit">Profit</th>
                <th style={{ textAlign: "center" }}>Items</th>
              </tr>
            </thead>
            <tbody>
              {data.sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{formatDate(sale.createdAt, { hour: undefined, minute: undefined })}</td>
                  <td>{sale.paymentMethod}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{formatMoney(sale.total)}</td>
                  <td style={{ textAlign: "right" }} className="np-report-profit">{formatMoney(sale.profit)}</td>
                  <td style={{ textAlign: "center" }}>{sale.items?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="np-report-rule" style={{ marginTop: 32, paddingTop: 20, textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "#9b978e" }}>Generated on {formatDate(new Date())}</p>
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
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @media print {
          @page { size: A4; margin: 20mm 15mm; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { font-family: 'Georgia', serif; background: #f3efe5; }
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
