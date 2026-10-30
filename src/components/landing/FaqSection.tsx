"use client";

import { useState } from "react";
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

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section id="faq" className="border-t border-rule border-b border-rule">
      <Container wide>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />

        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-black text-ink mb-4">
            Frequently Asked Questions
          </h2>
          <p className="font-reading text-secondary text-lg">
            Everything you need to know about Aide.
          </p>
        </div>

        <div className="mx-auto max-w-2xl space-y-1 font-display">
          {LANDING_FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <details key={faq.question} className="np-disclosure" open={isOpen}>
                <summary onClick={() => toggle(i)}>{faq.question}</summary>
                <div className="font-reading text-reading-compact text-secondary">
                  {faq.answer}
                </div>
              </details>
            );
          })}
        </div>

        <p className="mt-8 text-center font-display text-sm text-secondary">
          Still stuck?{" "}
          <a href="/help" className="font-black text-ink underline-offset-4 hover:underline">
            Visit the Help Centre
          </a>
        </p>
      </Container>
    </section>
  );
}