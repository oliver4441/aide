"use client";

import Container from "@/components/ui/Container";
import Link from "next/link";

const platforms = [
  {
    id: "pwa",
    label: "PWA",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-globe w-6 h-6"
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
      "Runs in a modern browser, installs to your home screen",
      "Cloud database + multi-device sync",
      "Full offline-first workflows",
      "Android, iPhone, Windows and macOS",
      "Records sync to your account",
    ],
    limitation: "In-app notifications (no system push)",
    cta: { label: "Install the PWA", href: "/login" },
  },
  {
    id: "android",
    label: "Android APK",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-smartphone w-6 h-6"
        aria-hidden="true"
      >
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
    badge: "Native Android",
    description: "A dedicated native Aide app built for your phone.",
    features: [
      "Real system notifications",
      "Background tasks & scheduled reminders",
      "Your records stay on the phone",
      "No account needed to start",
      "Works fully offline",
    ],
    limitation: "Local-first (no cloud account yet)",
    cta: { label: "Download APK", href: "/downloads" },
  },
  {
    id: "desktop",
    label: "Desktop",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-monitor w-6 h-6"
        aria-hidden="true"
      >
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <path d="M12 17v4" />
        <path d="M8 21h8" />
      </svg>
    ),
    badge: "Windows • macOS • Linux",
    description: "Native desktop apps wrapping the PWA — install once, work offline.",
    features: [
      "Native window with system integration",
      "Auto-updates via GitHub Releases",
      "Works offline with local data",
      "Keyboard shortcuts & menu bar",
      "SHA-256 verified downloads",
    ],
    limitation: "Requires internet for initial sync",
    cta: { label: "Download for Desktop", href: "/downloads" },
  },
] as const;

function PlatformCard({ platform }: { platform: (typeof platforms)[number] }) {
  return (
    <div className="border border-rule p-6 h-full flex flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center border border-rule text-accent">
          {platform.icon}
        </div>
        <div>
          <div className="font-display text-sm font-black text-ink leading-tight">
            {platform.label}
          </div>
          <div className="text-[11px] text-accent">{platform.badge}</div>
        </div>
      </div>
      <p className="font-reading text-sm text-secondary mb-5 leading-relaxed">
        {platform.description}
      </p>
      <ul className="space-y-2.5 text-sm text-ink mb-6 flex-1">
        {platform.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-check w-4 h-4 text-success shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="font-reading">{feature}</span>
          </li>
        ))}
        <li className="flex items-start gap-2 pt-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-minus w-4 h-4 text-secondary shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
          </svg>
          <span className="font-reading text-secondary">{platform.limitation}</span>
        </li>
      </ul>
      <Link
        href={platform.cta.href}
        className="np-btn inline-flex flex-shrink-0 px-6 py-3.5 text-sm w-full"
      >
        {platform.cta.label}
      </Link>
    </div>
  );
}

export default function DownloadSection() {
  return (
    <section id="download" className="border-t border-rule border-b border-rule py-16">
      <Container wide>
        <div className="text-center max-w-2xl mx-auto mb-4">
          <h2 className="font-display text-3xl md:text-4xl font-black text-ink mb-4">
            Choose how you run Aide
          </h2>
          <p className="font-reading text-secondary text-lg">
            Use Aide in your browser on any device, or install the Android app or
            Desktop app for native, always-on access.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {platforms.map((platform) => (
            <PlatformCard key={platform.id} platform={platform} />
          ))}
        </div>
        <p className="mt-10 text-center text-xs font-reading text-secondary">
          All variants share the same offline-first core — your data stays yours.
        </p>
      </Container>
    </section>
  );
}