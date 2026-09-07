import type { Metadata } from "next";
import POSPageInner from "./POSPageInner";

export const metadata: Metadata = {
  title: "POS — Aide",
  description:
    "Process sales on the point of sale — scan products, add to cart, take cash or M-Pesa, print receipts. Works offline.",
  openGraph: {
    title: "Aide — Point of Sale",
    description: "Process sales offline and print receipts.",
    images: [{ url: "/og-pos.jpg", width: 1200, height: 630, alt: "Aide POS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide — Point of Sale",
    description: "Process sales offline and print receipts.",
    images: ["/og-pos.jpg"],
  },
};

export default function POSPage() {
  return <POSPageInner />;
}
