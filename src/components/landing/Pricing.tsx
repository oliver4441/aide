import Link from "next/link";
import Container from "@/components/ui/Container";
import ScrollFadeIn from "@/components/landing/ScrollFadeIn";

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  popular?: boolean;
  cta: string;
  href: string;
  features: string[];
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "KSh 0",
    period: "/month",
    description: "Everything a solo shop needs to sell offline and track daily stock.",
    cta: "Start free",
    href: "/login",
    features: [
      "1 business & 1 device",
      "Up to 100 products with auto SKUs",
      "Offline POS & receipt printing",
      "Cash, M-Pesa & card recording",
      "Local CSV & JSON data export",
    ],
  },
  {
    name: "Growth",
    price: "KSh 1,500",
    period: "/month",
    description: "For growing shops syncing stock and sales across phone and counter.",
    popular: true,
    cta: "Get Growth",
    href: "/login",
    features: [
      "Unlimited products & categories",
      "Multi-device cloud sync",
      "Low-stock alerts & 7-day reports",
      "Thermal 80mm & A4 PDF receipts",
      "Priority email & chat support",
    ],
  },
  {
    name: "Business",
    price: "KSh 4,500",
    period: "/month",
    description: "For multi-branch teams that need shared visibility and higher limits.",
    cta: "Start with Business",
    href: "/login",
    features: [
      "Everything in Growth",
      "Multiple branches & staff access",
      "Movement-ledger stock reconciliation",
      "Custom receipt header & footer",
      "Dedicated onboarding assistance",
    ],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="border-t border-rule py-14 sm:py-16 lg:py-20">
      <Container wide>
        <ScrollFadeIn>
          <div className="mx-auto mb-10 max-w-xl text-center sm:mb-12">
            <p className="mb-4 font-display text-[10px] font-medium uppercase tracking-[.16em] text-accent">
              Simple pricing in KES
            </p>
            <h2 className="text-balance font-display text-3xl font-semibold tracking-[-.05em] text-ink sm:text-4xl">
              Start free, upgrade as you grow
            </h2>
            <p className="mt-4 text-pretty font-reading text-sm leading-6 text-secondary sm:text-[15px]">
              No hidden fees or hardware lock-in. Pick the plan that fits your counter today.
            </p>
          </div>
        </ScrollFadeIn>

        <ScrollFadeIn delay={0.08}>
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`flex flex-col rounded-xl border p-7 transition duration-300 hover:border-ink/25 sm:p-8 ${
                  plan.popular
                    ? "border-accent/60 bg-surface shadow-[0_24px_80px_-40px_rgba(46,91,255,0.45)]"
                    : "border-rule bg-surface"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold tracking-[-.03em] text-ink">
                    {plan.name}
                  </h3>
                  {plan.popular && (
                    <span className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-[.12em] text-accent">
                      Popular
                    </span>
                  )}
                </div>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-3xl font-semibold tabular-nums tracking-[-.05em] text-ink sm:text-4xl">
                    {plan.price}
                  </span>
                  <span className="font-reading text-xs text-muted">{plan.period}</span>
                </div>

                <p className="mt-3 font-reading text-sm leading-6 text-secondary">
                  {plan.description}
                </p>

                <ul className="my-7 flex-1 space-y-3 border-t border-rule pt-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-ink">
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
                </ul>

                <Link
                  href={plan.href}
                  className={`inline-flex items-center justify-center rounded-full px-6 py-3.5 font-display text-sm font-semibold transition active:scale-[0.98] ${
                    plan.popular
                      ? "bg-accent text-white hover:brightness-110"
                      : "border border-rule bg-ground text-ink hover:bg-[#1b1e24]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </ScrollFadeIn>
      </Container>
    </section>
  );
}
