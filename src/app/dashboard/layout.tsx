import Sidebar from "@/components/Sidebar";
import DashboardInit from "@/components/DashboardInit";
import AdBanner from "@/components/ads/AdBanner";
import HelpWidget from "@/components/help/HelpWidget";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import ReviewPrompt from "@/components/reviews/ReviewPrompt";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <DashboardInit />
      <OnboardingFlow />
      <Sidebar />
      <div className="md:ml-[280px] pt-4 pb-24 md:pb-4">
        <header className="hidden md:flex items-center justify-end px-10 pt-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/20 text-warning border border-warning/30">BETA</span>
        </header>
        <div className="p-4 md:px-10 md:pb-10 max-w-[1200px] mx-auto animate-fade-in">
          {children}
        </div>
      </div>
      <AdBanner position="bottom" />
      <HelpWidget />
      <ReviewPrompt />
    </div>
  );
}
