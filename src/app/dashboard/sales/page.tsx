import type { Metadata } from "next";
import SalesPageInner from "./SalesPageInner";

export const metadata: Metadata = {
  title: "Sales — Aide",
  description:
    "View your sales history on Aide — see every transaction, filter by date, print receipts, and export as CSV or JSON.",
  openGraph: {
    title: "Aide — Sales History",
    description: "See every transaction, print receipts, and export sales.",
    images: [{ url: "/og-sales.jpg", width: 1200, height: 630, alt: "Aide sales" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide — Sales History",
    description: "See every transaction, print receipts, and export sales.",
    images: ["/og-sales.jpg"],
  },
};

export default function SalesPage() {
  return <SalesPageInner />;
}
