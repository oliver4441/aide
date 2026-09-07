import type { Metadata } from "next";
import DashboardPageInner from "./DashboardPageInner";

export const metadata: Metadata = {
  title: "Dashboard — Aide",
  description:
    "Your Aide dashboard: today's revenue, profit, product count, and low-stock alerts — all from local IndexedDB.",
  openGraph: {
    title: "Aide — Dashboard",
    description: "Today's revenue, profit, and low-stock alerts from your business.",
    images: [{ url: "/og-dashboard.jpg", width: 1200, height: 630, alt: "Aide dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide — Dashboard",
    description: "Today's revenue, profit, and low-stock alerts from your business.",
    images: ["/og-dashboard.jpg"],
  },
};

export default function DashboardPage() {
  return <DashboardPageInner />;
}
