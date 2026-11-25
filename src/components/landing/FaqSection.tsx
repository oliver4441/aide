"use client";

import { useState } from "react";
import Link from "next/link";
import { LANDING_FAQS, FAQS } from "@/lib/faqs";
import Container from "@/components/ui/Container";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

const visibleFaqs = LANDING_FAQS.slice(0, 6);

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section id="faq" className="border-t border-rule py-14 sm:py-16 lg:py-20">
      <Container wide>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />

        <div className="mx-auto mb-10 max-w-xl text-center sm:mb-12">
          <p className="mb-4 font-display text-[10px] font-medium uppercase tracking-[.16em] text-accent">
            Common questions
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-[-.05em] text-ink sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 font-reading text-sm leading-6 text-secondary sm:text-[15px]">
            Everything you need to know about selling offline, syncing and receipts.
          </p>
        </div>

        <div className="mx-auto max-w-3xl divide-y divide-rule rounded-xl border border-rule bg-surface">
          {visibleFaqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={faq.question} className="px-6 sm:px-8">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-sm font-semibold text-ink transition hover:text-accent sm:text-base"
                >
                  <span>{faq.question}</span>
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rule font-display text-sm text-secondary"
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div className="pb-6 pr-8 font-reading text-sm leading-6 text-secondary sm:text-[15px]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center font-reading text-sm text-secondary">
          Still have questions?{" "}
          <Link href="/help" className="font-display font-semibold text-ink underline-offset-4 hover:text-accent hover:underline">
            Visit the Help Centre
          </Link>
        </p>
      </Container>
    </section>
  );
}
