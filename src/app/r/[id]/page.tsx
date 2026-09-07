import type { Metadata } from "next";
import SharedReceiptPage from "./SharedReceiptPageClient";

export const metadata: Metadata = {
  title: "Your Receipt — Aide",
  description:
    "View and download your Aide receipt. Save as PDF, print, or share via QR code. Offline-first business management for Kenyan businesses.",
  openGraph: {
    title: "Aide — Your Receipt",
    description: "View and download your Aide receipt.",
    images: [{ url: "/og-receipt.jpg", width: 1200, height: 630, alt: "Aide receipt" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide — Your Receipt",
    description: "View and download your Aide receipt.",
    images: ["/og-receipt.jpg"],
  },
};

export default SharedReceiptPage;
