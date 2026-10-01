"use client";

import ScrollFadeIn from "./ScrollFadeIn";
import UiButton from "@/components/ui/UiButton";
import Container from "@/components/ui/Container";
import {
  Globe,
  Smartphone,
  Monitor,
  Check,
  Minus,
  type LucideIcon,
} from "lucide-react";

interface Variant {
  key: string;
  name: string;
  tag: string;
  icon: LucideIcon;
  accent: string;
  desc: string;
  strengths: string[];
  limit: string;
  cta: string;
  href: string;
}

const RELEASES = "https://github.com/oliver4441/aide/releases";

const variants: Variant[] = [
  {
    key: "pwa",
    name: "Aide PWA",
    tag: "Cloud sync & offline",
    icon: Globe,
    accent: "border-primary/40 shadow-xl shadow-primary/5",
    desc: "Open it in your browser or install it to your home screen. Runs everywhere.",
    strengths: [
      "Works in any browser & installable",
      "Cloud database + multi-device sync",
      "Full offline-first workflows",
      "Cross-platform: Android, iOS, Windows, macOS",
      "Automatic cloud backup",
    ],
    limit: "In-app notifications (no system push)",
    cta: "Install the PWA",
    href: "/login",
  },
  {
    key: "android",
    name: "Android APK",
    tag: "Native Android",
    icon: Smartphone,
    accent: "border-outline-variant",
    desc: "A dedicated native Aide app built for your phone.",
    strengths: [
      "Real system notifications",
      "Background tasks & scheduled reminders",
      "Native Android integrations",
      "Faster everyday use on phones",
      "Works fully offline",
    ],
    limit: "Local-first (no cloud account yet)",
    cta: "Download APK",
    href: RELEASES,
  },
  {
    key: "windows",
    name: "Windows EXE",
    tag: "Native Desktop",
    icon: Monitor,
    accent: "border-outline-variant",
    desc: "A native Windows desktop app for daily business use at the till or office.",
    strengths: [
      "Real system notifications",
      "Background tasks & scheduled reminders",
      "Native desktop integrations",
      "Receipt printing & faster workflows",
      "Works fully offline",
    ],
    limit: "Desktop only",
    cta: "Download for Windows",
    href: RELEASES,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="border-y border-outline-variant bg-surface-container-low py-24">
      <Container wide>
        <ScrollFadeIn>
          <div className="text-center max-w-2xl mx-auto mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-on-surface mb-4 font-headline">
              Choose how you run Aide
            </h2>
            <p className="text-on-surface-variant text-lg">
              The same Aide — available as a web PWA, a native Android app, or a Windows desktop app. Pick the best fit for your business.
            </p>
          </div>
        </ScrollFadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {variants.map((v, i) => (
            <ScrollFadeIn key={v.key} delay={i * 100}>
              <div className={`bg-surface-container-lowest border rounded-2xl p-6 h-full flex flex-col relative ${v.accent}`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <v.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-on-surface font-headline leading-tight">{v.name}</div>
                    <div className="text-[11px] font-medium text-primary">{v.tag}</div>
                  </div>
                </div>

                <p className="text-sm text-on-surface-variant mb-5 leading-relaxed">{v.desc}</p>

                <ul className="space-y-2.5 text-sm text-on-surface mb-6 flex-1">
                  {v.strengths.map((s, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2 pt-1">
                    <Minus className="w-4 h-4 text-on-surface-variant/50 shrink-0 mt-0.5" />
                    <span className="text-on-surface-variant">{v.limit}</span>
                  </li>
                </ul>

                <UiButton href={v.href} className="w-full">
                  {v.cta}
                </UiButton>
              </div>
            </ScrollFadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
