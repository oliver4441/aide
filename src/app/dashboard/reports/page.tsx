import type { Metadata } from "next";
import ReportsPageInner from "./ReportsPageInner";

export const metadata: Metadata = {
  title: "Reports — Aide",
  description:
    "Sales reports and analytics on Aide — revenue charts, top products, payment breakdowns, and printable A4 reports.",
  openGraph: {
    title: "Aide — Reports & Analytics",
    description: "Revenue charts, top products, and payment breakdowns.",
    images: [{ url: "/og-reports.jpg", width: 1200, height: 630, alt: "Aide reports" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide — Reports & Analytics",
    description: "Revenue charts, top products, and payment breakdowns.",
    images: ["/og-reports.jpg"],
  },
};

export default function ReportsPage() {
  return <ReportsPageInner />;
}
