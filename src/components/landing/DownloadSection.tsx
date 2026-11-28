"use client";

import Container from "@/components/ui/Container";
import Link from "next/link";
import ScrollFadeIn from "@/components/landing/ScrollFadeIn";

const platforms = [
  {
    id: "pwa",
    label: "Web App (PWA)",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
    badge: "Cloud sync & offline",
    description: "Open in your browser or install to your home screen. Runs everywhere.",
    features: [
      "Installs from Chrome, Safari or Edge",
      "Cloud database + multi-device sync",
      "Full offline-first POS & inventory",
      "Team roles, shifts & financials",
      "Google or email/password sign-in",
    ],
    limitation: "In-app notifications (no system push)",
    cta: { label: "Open Web App", href: "/login" },
  },
  {
    id: "android",
    label: "Android APK",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
    badge: "Native Android",
    description: "A dedicated native Aide app built for phones and tablets.",
    features: [
      "Real system low-stock & daily alerts",
      "Collapsible nav rail for phones & tablets",
      "Your records stay privately on the phone",
      "No account needed to start selling",
      "SHA-256 verified APK builds",
    ],
    limitation: "Local-only on device (export anytime)",
    cta: { label: "Download APK", href: "/downloads" },
  },
  {
    id: "desktop",
    label: "Desktop",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <path d="M12 17v4" />
        <path d="M8 21h8" />
      </svg>
    ),
    badge: "Windows · macOS · Linux",
    description: "Dedicated desktop installers built for fixed counter tills.",
    features: [
      "Native window with system integration",
      "Auto-updates via GitHub Releases",
      "Works offline with cloud sync",
      "Thermal 80mm & A4 receipt printing",
      "SHA-256 verified downloads",
    ],
    limitation: "Requires internet for initial sign-in",
    cta: { label: "Download for Desktop", href: "/downloads" },
  },
] as const;

function PlatformCard({ platform }: { platform: (typeof platforms)[number] }) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-rule bg-surface p-7 transition duration-300 hover:border-ink/25 sm:p-8">
      <div className="mb-5 flex items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rule bg-ground text-accent">
          {platform.icon}
        </div>
        <div>
          <h3 className="font-display text-base font-semibold tracking-[-.02em] text-ink">
            {platform.label}
          </h3>
          <p className="font-display text-[11px] font-medium text-accent">{platform.badge}</p>
        </div>
      </div>

      <p className="mb-6 font-reading text-sm leading-6 text-secondary">
        {platform.description}
      </p>

      <ul className="mb-7 flex-1 space-y-2.5 border-t border-rule pt-6 text-sm text-ink">
        {platform.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
            </svg>
            <span className="font-reading text-secondary">{feature}</span>
          </li>
        ))}
        <li className="flex items-start gap-2.5 pt-1">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path d="M5 12h14" />
          </svg>
          <span className="font-reading text-muted">{platform.limitation}</span>
        </li>
      </ul>

      <Link
        href={platform.cta.href}
        className="inline-flex items-center justify-center rounded-full border border-rule bg-ground px-6 py-3 font-display text-sm font-semibold text-ink transition hover:border-ink/40 hover:bg-[#1b1e24] active:scale-[0.98]"
      >
        {platform.cta.label}
      </Link>
    </article>
  );
}

export default function DownloadSection() {
  return (
    <section id="download" className="border-t border-rule py-14 sm:py-16 lg:py-20">
      <Container wide>
        <ScrollFadeIn>
          <div className="mx-auto mb-10 max-w-xl text-center sm:mb-12">
            <p className="mb-4 font-display text-[10px] font-medium uppercase tracking-[.16em] text-accent">
              Every device, your choice
            </p>
            <h2 className="text-balance font-display text-3xl font-semibold tracking-[-.05em] text-ink sm:text-4xl">
              Choose how you run Aide
            </h2>
            <p className="mt-4 text-pretty font-reading text-sm leading-6 text-secondary sm:text-[15px]">
              Use Aide in your browser on any device, or install the native Android or
              Desktop app for always-on access.
            </p>
          </div>
        </ScrollFadeIn>

        <ScrollFadeIn delay={0.08}>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
            {platforms.map((platform) => (
              <PlatformCard key={platform.id} platform={platform} />
            ))}
          </div>
        </ScrollFadeIn>

        <p className="mt-10 text-center font-reading text-xs text-muted">
          All builds are verified with SHA-256 checksums on{" "}
          <Link href="/downloads" className="text-secondary underline-offset-4 hover:text-ink hover:underline">
            the downloads page
          </Link>
          .
        </p>
      </Container>
    </section>
  );
}
