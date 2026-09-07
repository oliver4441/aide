import Link from "next/link";
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
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <span className="text-4xl font-bold text-on-primary font-headline">404</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-on-surface font-headline mb-3">
          Page not found
        </h1>
        <p className="text-on-surface-variant text-lg mb-8">
          This page isn't available. It may have been moved or doesn't exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="bg-primary text-on-primary font-semibold py-3 rounded-xl hover:bg-primary-light transition-colors px-6 shadow-md"
          >
            Go home
          </Link>
          <Link
            href="/help"
            className="bg-surface-container border border-outline-variant text-on-surface font-semibold py-3 rounded-xl hover:bg-surface-container-high transition-colors px-6"
          >
            Help center
          </Link>
        </div>
        <p className="text-xs text-on-surface-variant mt-8">
          Aide · Offline-First Business Management
        </p>
      </div>
    </div>
  );
}
