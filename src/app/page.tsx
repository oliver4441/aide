import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import Features from "@/components/landing/Features";
import Process from "@/components/landing/Process";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import FaqSection from "@/components/landing/FaqSection";
import DownloadSection from "@/components/landing/DownloadSection";
import CtaSection from "@/components/landing/CtaSection";
import LandingFooter from "@/components/landing/LandingFooter";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

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
  alternates: {
    canonical: SITE_URL,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Aide",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android, Windows, macOS, Linux",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KES",
  },
  description:
    "Offline-first POS, inventory, receipts and business accounting software for small businesses.",
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-ground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:font-display focus:text-xs focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <LandingNav />
        <main id="main-content">
          <Hero />
          <SocialProof />
          <Features />
          <Process />
          <Testimonials />
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
