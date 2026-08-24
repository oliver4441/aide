"use client";

import Link from "next/link";
import ScrollFadeIn from "./ScrollFadeIn";

const tiers = [
  {
    name: "Free",
    price: "KSh 0",
    period: "Free forever",
    features: ["1 business", "Up to 50 products", "Basic POS", "Sales history"],
    cta: "Get Started",
    featured: false,
    comingSoon: false,
  },
  {
    name: "Pro",
    price: "KSh 1,490",
    period: "per month",
    features: [
      "Unlimited businesses",
      "Unlimited products",
      "Advanced POS",
      "Reports & analytics",
      "Receipt printing",
      "Low stock alerts",
      "Priority support",
    ],
    cta: "Start Free Trial",
    featured: true,
    comingSoon: true,
  },
  {
    name: "Enterprise",
    price: "KSh 4,990",
    period: "per month",
    features: [
      "Everything in Pro",
      "Multi-location",
      "Staff management",
      "API access",
      "Custom integrations",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    featured: false,
    comingSoon: true,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-surface-container-low border-y border-outline-variant">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        <ScrollFadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-on-surface mb-4 font-headline">
              Simple, Transparent Pricing
            </h2>
            <p className="text-on-surface-variant text-lg">
              Start free. Upgrade when you&apos;re ready. No hidden fees.
            </p>
          </div>
        </ScrollFadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {tiers.map((tier, i) => (
            <ScrollFadeIn key={i} delay={i * 100}>
              <div
                className={`bg-surface-container-lowest border rounded-2xl p-6 h-full flex flex-col relative ${
                  tier.comingSoon ? "opacity-60" : ""
                } ${tier.featured && !tier.comingSoon ? "border-primary/40 shadow-xl shadow-primary/5" : "border-outline-variant"}`}
              >
                {tier.featured && !tier.comingSoon && (
                  <div className="self-center -mt-8 mb-2 bg-primary text-on-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                {tier.comingSoon && (
                  <div className="self-center -mt-8 mb-2 bg-warning/20 text-warning text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Coming Soon
                  </div>
                )}
                <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">{tier.name}</div>
                <div className="text-3xl font-bold text-on-surface font-headline mb-1">{tier.price}</div>
                <div className="text-sm text-on-surface-variant mb-6">{tier.period}</div>
                <ul className="space-y-3 text-sm text-on-surface-variant mb-6 flex-1">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                {tier.comingSoon ? (
                  <div className="block text-center py-2.5 rounded-xl text-sm font-semibold border border-outline-variant text-on-surface-variant cursor-not-allowed flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Coming Soon
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      tier.featured
                        ? "bg-primary text-on-primary hover:bg-primary-light"
                        : "border border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                )}
              </div>
            </ScrollFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
