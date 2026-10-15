import Sidebar from "@/components/Sidebar";
import DashboardInit from "@/components/DashboardInit";
import BusinessGate from "@/components/BusinessGate";
import BackgroundLayer from "@/components/BackgroundLayer";
import AdBanner from "@/components/ads/AdBanner";
import HelpWidget from "@/components/help/HelpWidget";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import ReviewPrompt from "@/components/reviews/ReviewPrompt";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import UpdatePrompt from "@/components/pwa/UpdatePrompt";
import SyncNowButton from "@/components/pwa/SyncNowButton";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationPermissionPrompt from "@/components/notifications/NotificationPermissionPrompt";
import Link from "next/link";
import { DashboardContentWrapper } from "@/components/DashboardContentWrapper";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface app-page-bg flex flex-col">
      <BackgroundLayer />
      <DashboardInit />
      <OnboardingFlow />
      <BusinessGate />
      {/* Top-right notification bell */}
      <div className="fixed top-4 right-4 z-[60]">
        <NotificationBell />
      </div>
      <Sidebar />
      <DashboardContentWrapper>
        <AdBanner />
        <div className="p-4 md:px-10 md:pb-10 max-w-[1200px] mx-auto animate-fade-in flex-1">
          <nav className="text-sm text-on-surface-variant mb-2 flex items-center gap-2 flex-wrap" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-on-surface transition-colors">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Dashboard</span>
          </nav>
          {children}
        </div>
        {/* Footer strip - OmixSystems 2026 */}
        <footer className="border-t border-outline-variant py-3 px-4 md:px-10">
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>© 2026 OmixSystems</span>
            <a
              href="https://omixsystems.store"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium transition-colors"
            >
              omixsystems.store
            </a>
          </div>
        </footer>
      </DashboardContentWrapper>
      <HelpWidget />
      <ReviewPrompt />
      <InstallPrompt />
      <UpdatePrompt />
      <SyncNowButton />
      <NotificationPermissionPrompt />
    </div>
  );
}
