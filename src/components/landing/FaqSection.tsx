"use client";

import { useState } from "react";
import ScrollFadeIn from "./ScrollFadeIn";

const faqs = [
  { q: "Does Aide support M-Pesa payments?", a: "Yes! Aide supports M-Pesa, cash, card, and other mobile money payments. Track all payment methods in your sales history." },
  { q: "Does Aide work offline?", a: "Yes. Aide is a Progressive Web App (PWA) that works fully offline. All sales, inventory, and data are stored on your device and sync automatically when you reconnect." },
  { q: "How do I install Aide on my phone?", a: "Open aide-sooty-xi.vercel.app in Chrome on Android, tap the menu (3 dots), and select 'Add to Home Screen'. On iPhone, tap the Share button and 'Add to Home Screen'." },
  { q: "Can I print receipts?", a: "Yes! Aide generates supermarket-grade receipts with VAT calculation. Print via Bluetooth thermal printer or share as PDF." },
  { q: "Is my data safe?", a: "Your data is stored locally on your device first (IndexedDB), then encrypted and synced to secure cloud servers. You own your data." },
  { q: "Can I manage multiple businesses?", a: "Yes. Create and switch between multiple businesses from one account. Each business has its own inventory, sales, and reports." },
  { q: "What does 'Coming Soon' mean on the pricing page?", a: "Aide is currently in BETA. The free tier is fully available now. Pro and Enterprise features are being built and will launch soon at the prices shown." },
  { q: "How do I report a bug or request a feature?", a: "Use the Help Center (click the ? button in the app) or email support@omixsystems.store. We respond within 24 hours." },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-4 md:px-8 max-w-[1440px] mx-auto">
      <ScrollFadeIn>
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-on-surface mb-4 font-headline">
            Frequently Asked Questions
          </h2>
          <p className="text-on-surface-variant text-lg">
            Everything you need to know about Aide.
          </p>
        </div>
      </ScrollFadeIn>

      <div className="max-w-2xl mx-auto space-y-3">
        {faqs.map((faq, i) => (
          <ScrollFadeIn key={i} delay={i * 50}>
            <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-semibold text-on-surface pr-4">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-on-surface-variant shrink-0 transition-transform duration-200 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-4 text-sm text-on-surface-variant leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          </ScrollFadeIn>
        ))}
      </div>
    </section>
  );
}
