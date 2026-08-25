import Sidebar from "@/components/Sidebar";
import DashboardInit from "@/components/DashboardInit";
import BusinessGate from "@/components/BusinessGate";
import AdBanner from "@/components/ads/AdBanner";
import HelpWidget from "@/components/help/HelpWidget";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import ReviewPrompt from "@/components/reviews/ReviewPrompt";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import UpdatePrompt from "@/components/pwa/UpdatePrompt";
import SyncNowButton from "@/components/pwa/SyncNowButton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <DashboardInit />
      <OnboardingFlow />
      <BusinessGate />
      <Sidebar />
      <div className="md:ml-[260px] pt-2 pb-24 md:pb-6">
        <AdBanner />
        <div className="p-4 md:px-10 md:pb-10 max-w-[1200px] mx-auto animate-fade-in">
          {children}
        </div>
      </div>
      <HelpWidget />
      <ReviewPrompt />
      <InstallPrompt />
      <UpdatePrompt />
      <SyncNowButton />
    </div>
  );
}
