import Link from "next/link";
import UiButton from "@/components/ui/UiButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found — Aide",
  description:
    "This page isn't available on Aide. Return to the home page or visit the help center.",
  openGraph: {
    title: "Aide — Page Not Found",
    description: "Return to the home page or visit the help center.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Aide" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide — Page Not Found",
    description: "Return to the home page or visit the help center.",
    images: ["/og.jpg"],
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[130px]" />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <img src="/logo.jpg" alt="Aide logo" className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-4 ring-primary/10" />
        </div>
        <div className="text-7xl font-bold text-primary/80 font-headline tracking-tight">404</div>
        <h1 className="mt-2 text-3xl font-bold text-on-surface font-headline">Page not found</h1>
        <p className="text-on-surface-variant text-lg mt-3 mb-8">
          This page isn&apos;t available. It may have been moved or doesn&apos;t exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <UiButton href="/" className="w-full sm:w-auto">
            Go home
          </UiButton>
          <UiButton href="/help" variant="outline" className="w-full sm:w-auto">
            Help center
          </UiButton>
        </div>
        <p className="text-xs text-on-surface-variant mt-8">
          Aide · Offline-First Business Management
        </p>
      </div>
    </div>
  );
}
