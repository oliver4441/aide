import type { Metadata } from "next";
import InventoryPageInner from "./InventoryPageInner";

export const metadata: Metadata = {
  title: "Inventory — Aide",
  description:
    "Manage your products and stock on Aide — add items, set prices, track quantity, and auto-generate SKUs.",
  openGraph: {
    title: "Aide — Inventory",
    description: "Add products, set prices, track stock, and auto-generate SKUs.",
    images: [{ url: "/og-inventory.jpg", width: 1200, height: 630, alt: "Aide inventory" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide — Inventory",
    description: "Add products, set prices, track stock, and auto-generate SKUs.",
    images: ["/og-inventory.jpg"],
  },
};

export default function InventoryPage() {
  return <InventoryPageInner />;
}
