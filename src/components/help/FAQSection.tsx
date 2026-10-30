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
    <section className="font-reading">
      <h2 className="font-display text-2xl font-black text-ink mb-6">
        Frequently Asked Questions
      </h2>

      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.category}>
            <h3 className="font-display text-xs font-black uppercase tracking-widest text-secondary mb-3">
              {group.category}
            </h3>
            <div className="space-y-0 font-display">
              {group.items.map((faq) => {
                const isOpen = expanded === faq.question;
                return (
                  <div key={faq.question} className="np-disclosure">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setExpanded(isOpen ? null : faq.question)}
                      className="text-sm font-black text-ink"
                    >
                      {faq.question}
                    </button>
                    {isOpen && (
                      <div className="pt-2 text-sm text-secondary leading-relaxed">
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
