"use client";

import { useState } from "react";
import ScrollFadeIn from "./ScrollFadeIn";
import { LANDING_FAQS, FAQS } from "@/lib/faqs";
import Container from "@/components/ui/Container";

/**
 * Structured data for Google. Built from the same source the UI renders, so the
 * markup can never describe answers the page does not actually show.
 */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24">
      <Container>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <ScrollFadeIn>
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="mb-4 font-headline text-3xl font-bold text-on-surface md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-on-surface-variant">
            Everything you need to know about Aide.
          </p>
        </div>
      </ScrollFadeIn>

      <div className="mx-auto max-w-2xl space-y-3">
        {LANDING_FAQS.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <ScrollFadeIn key={faq.question} delay={i * 50}>
              <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container transition-colors duration-200 ease-out hover:border-primary/30">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-on-surface">{faq.question}</span>
                  <svg
                    aria-hidden="true"
                    className={`h-5 w-5 shrink-0 text-on-surface-variant transition-transform duration-200 ease-out ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 text-sm leading-relaxed text-on-surface-variant">
                    {faq.answer}
                  </div>
                )}
              </div>
            </ScrollFadeIn>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-on-surface-variant">
        Still stuck?{" "}
        <a href="/help" className="font-semibold text-primary underline-offset-4 hover:underline">
          Visit the Help Centre
        </a>
      </p>
      </Container>
    </section>
  );
}
