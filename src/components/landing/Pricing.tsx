"use client";

import UiButton from "@/components/ui/UiButton";
import Container from "@/components/ui/Container";
import {
  Globe,
  Smartphone,
  Check,
  Minus,
  type LucideIcon,
} from "lucide-react";

interface Variant {
  key: string;
  name: string;
  tag: string;
  icon: LucideIcon;
  desc: string;
  strengths: string[];
  limit: string;
  cta: string;
  href: string;
}

const RELEASES = "/downloads";

const variants: Variant[] = [
  {
    key: "pwa",
    name: "Aide PWA",
    tag: "Cloud sync & offline",
    icon: Globe,
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
];

export default function Pricing() {
  return (
    <section id="pricing" className="border-t border-rule border-b border-rule py-16">
      <Container wide>
        <div className="text-center max-w-2xl mx-auto mb-4">
          <h2 className="font-display text-3xl md:text-4xl font-black text-ink mb-4">
            Choose how you run Aide
          </h2>
          <p className="font-reading text-secondary text-lg">
            Use Aide in your browser on any device, or install the Android app for native notifications and reminders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {variants.map((v) => (
            <div key={v.key} className="border border-rule p-6 h-full flex flex-col">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center border border-rule text-accent">
                  <v.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display text-sm font-black text-ink leading-tight">{v.name}</div>
                  <div className="text-[11px] text-accent">{v.tag}</div>
                </div>
              </div>

              <p className="font-reading text-base leading-relaxed text-secondary mb-5">{v.desc}</p>

              <ul className="mb-6 flex-1 space-y-2.5 text-base text-ink">
                {v.strengths.map((s, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span className="font-reading">{s}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2 pt-1">
                  <Minus className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                  <span className="font-reading text-secondary">{v.limit}</span>
                </li>
              </ul>

              <UiButton href={v.href} className="w-full">
                {v.cta}
              </UiButton>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}