import type { Metadata } from "next";
import ReportsPageInner from "./ReportsPageInner";

export const metadata: Metadata = {
  title: "Reports — Aide",
  description:
    "Aide reports: revenue, cost, profit, top products and payment breakdown for today, this week, this month and the last 7 days. Export or print, offline-first.",
};

export default function ReportsPage() {
  return <ReportsPageInner />;
}
