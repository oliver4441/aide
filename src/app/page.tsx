import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import CtaSection from "@/components/landing/CtaSection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <LandingNav />
      <Hero />
      <SocialProof />
      <Features />
      <Pricing />
      <CtaSection />
      <LandingFooter />
    </div>
  );
}
