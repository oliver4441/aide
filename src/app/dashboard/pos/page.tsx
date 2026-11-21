import type { Metadata } from "next";
import POSPageInner from "./POSPageInner";

export const metadata: Metadata = {
  title: "Point of Sale — Aide",
  description:
    "Aide point of sale: build a cart from local stock, take cash, M-Pesa or card, and print a receipt — all offline.",
};

export default function POSPage() {
  return <POSPageInner />;
}
