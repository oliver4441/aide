import type { Metadata } from "next";
import SalesPageInner from "./SalesPageInner";

export const metadata: Metadata = {
  title: "Sales History — Aide",
  description:
    "Every sale recorded in Aide with totals, profit and payment method — exportable to CSV or JSON. Stored locally, synced when online.",
};

export default function SalesPage() {
  return <SalesPageInner />;
}
