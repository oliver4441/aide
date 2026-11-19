import type { Metadata } from "next";
import FinancialsPageInner from "./FinancialsPageInner";

export const metadata: Metadata = {
  title: "Financials — Aide",
  description: "Profit & Loss, Balance Sheet, Cash Flow, and Trial Balance.",
};

export default function FinancialsPage() {
  return <FinancialsPageInner />;
}
