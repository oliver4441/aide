import type { Metadata } from "next";
import POSPageInner from "./POSPageInner";

export const metadata: Metadata = {
  title: "Point of Sale — Aide",
  description:
    "Aide point of sale: ring up products, pick payment method, print receipts or share QR receipts offline-first.",
};

export default function POSPage() {
  return <POSPageInner />;
}
