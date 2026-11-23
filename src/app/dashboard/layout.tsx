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
import OfflineStatus from "@/components/OfflineStatus";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationPermissionPrompt from "@/components/notifications/NotificationPermissionPrompt";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent">
      <DashboardInit />
      <OnboardingFlow />
      <BusinessGate />
      <Sidebar />
      <div className="md:ml-[260px] pb-24 md:pb-6">
        <header className="sticky top-0 z-40 border-b border-rule bg-ground/90 backdrop-blur-sm">
          <div className="px-4 md:px-10 py-3 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            <nav className="text-sm text-secondary flex items-center gap-2 flex-wrap" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-ink">Home</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page" className="text-ink font-medium">Dashboard</span>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
        </header>
        <AdBanner />
        <div className="p-4 md:px-10 md:py-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </div>
      {/* Offline indicator removed */}
      <HelpWidget />
      <ReviewPrompt />
      <InstallPrompt />
      <UpdatePrompt />
      <SyncNowButton />
      <NotificationPermissionPrompt />
    </div>
  );
}
