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
  title: "Aide — Simple business management that works offline",
  description:
    "Aide gives small businesses an offline-first PWA for sales, inventory, receipts and reporting. Open it in your browser, install it, and keep working without internet.",
  openGraph: {
    title: "Aide — Simple business management that works offline",
    description:
      "Sales, inventory, receipts and reports in one offline-first PWA.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Aide business management" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide — Simple business management that works offline",
    description:
      "Sales, inventory, receipts and reports in one offline-first PWA.",
    images: ["/og.jpg"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Aide",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KES",
  },
  description:
    "Offline-first PWA business management software for sales, inventory and reporting.",
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
        <main>
          <Hero />
          <SocialProof />
          <Features />
          <Pricing />
          <FaqSection />
          <DownloadSection />
          <CtaSection />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
