import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import Features from "@/components/landing/Features";
import FaqSection from "@/components/landing/FaqSection";
import Pricing from "@/components/landing/Pricing";
import CtaSection from "@/components/landing/CtaSection";
import LandingFooter from "@/components/landing/LandingFooter";
import DownloadSection from "@/components/landing/DownloadSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline-First POS, Inventory & Analytics — Aide",
  description:
    "Aide gives Kenyan businesses an offline-first POS, inventory management and live analytics. Add products, sell on the POS, print receipts, export sales — works without internet and syncs when online.",
  openGraph: {
    title: "Aide — Offline-First POS, Inventory & Analytics",
    description:
      "Add products, sell on the POS, print receipts, export sales — works without internet and syncs when online.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Aide landing page" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide — Offline-First POS, Inventory & Analytics",
    description:
      "Add products, sell on the POS, print receipts, export sales — works without internet and syncs when online.",
    images: ["/og.jpg"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Aide",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Android",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KES",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    bestRating: "5",
    ratingCount: "214",
  },
  description:
    "Offline-first POS, inventory and reporting for Kenyan businesses. Works without internet, prints receipts, syncs when online.",
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-surface text-on-surface">
        <LandingNav />
        <Hero />
        <SocialProof />
        <Features />
        <FaqSection />
        <Pricing />
        <CtaSection />
        <LandingFooter />
        <DownloadSection version="1.0.1" />
      </div>
    </>
  );
}
