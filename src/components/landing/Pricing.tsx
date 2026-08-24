"use client";

import Link from "next/link";
import ScrollFadeIn from "./ScrollFadeIn";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["1 business", "Up to 50 products", "Basic POS", "Sales history"],
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Pro",
    price: "$12",
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
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "tailored for you",
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
                className={`bg-surface-container-lowest border rounded-2xl p-6 h-full flex flex-col ${
                  tier.featured ? "border-primary/40 shadow-xl shadow-primary/5" : "border-outline-variant"
                }`}
              >
                {tier.featured && (
                  <div className="self-center -mt-8 mb-2 bg-primary text-on-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
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
              </div>
            </ScrollFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
