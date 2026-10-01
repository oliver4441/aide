"use client";

import { useState } from "react";
import { getFaqsByCategory } from "@/lib/faqs";

/**
 * Help-centre FAQ. Renders the shared dataset grouped by category so the
 * answers here can never disagree with the landing page or the in-app panel.
 */
export default function FAQSection() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const groups = getFaqsByCategory();

  return (
    <section>
      <h2 className="mb-6 font-headline text-2xl font-bold text-on-surface">
        Frequently Asked Questions
      </h2>

      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.category}>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
              {group.category}
            </h3>
            <div className="space-y-3">
              {group.items.map((faq) => {
                const isOpen = expanded === faq.question;
                return (
                  <div
                    key={faq.question}
                    className="overflow-hidden rounded-xl border border-outline-variant transition-colors duration-200 ease-out hover:border-primary/30"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setExpanded(isOpen ? null : faq.question)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-on-surface transition-colors duration-200 hover:bg-surface-container"
                    >
                      <span>{faq.question}</span>
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
                      <div className="border-t border-outline-variant px-5 pb-5 pt-4 text-sm leading-relaxed text-on-surface-variant">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
