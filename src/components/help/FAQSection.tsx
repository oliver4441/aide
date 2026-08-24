"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How does offline mode work?",
    answer:
      "Aide stores all your data locally using IndexedDB. When you lose internet, everything keeps working — you can still make sales, manage inventory, and view reports. When connectivity returns, your data syncs automatically to the cloud.",
  },
  {
    question: "How do I install Aide on my phone?",
    answer:
      "Open Aide in your mobile browser, tap the share icon (iOS) or three-dot menu (Android), and select 'Add to Home Screen'. This installs it as a Progressive Web App that works just like a native app.",
  },
  {
    question: "Can I use Aide on multiple devices?",
    answer:
      "Yes! Sign in with the same account on any device. All your data — products, sales, settings — syncs across devices in real-time when connected to the internet.",
  },
  {
    question: "How do I export my data?",
    answer:
      "Go to Settings → Data Export. You can export your complete sales history, inventory list, and analytics reports as CSV files that open in any spreadsheet app.",
  },
  {
    question: "What happens when I lose internet?",
    answer:
      "Nothing changes! Aide is built as an offline-first application. All operations continue locally and sync seamlessly when you're back online.",
  },
  {
    question: "How do I change my business settings?",
    answer:
      "Navigate to Settings in the sidebar. You can update your business name, tax rate, currency symbol, receipt footer text, and other preferences at any time.",
  },
];

export default function FAQSection() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <section>
      <h2 className="text-2xl font-bold text-on-surface font-headline mb-6">
        Frequently Asked Questions
      </h2>
      <div className="space-y-3">
        {faqs.map((faq, i) => {
          const isExpanded = expandedIdx === i;
          return (
            <div
              key={i}
              className="border border-outline-variant rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
              >
                <span>{faq.question}</span>
                <svg
                  className={`w-5 h-5 text-on-surface-variant shrink-0 ml-4 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isExpanded && (
                <div className="px-5 pb-5 text-sm text-on-surface-variant leading-relaxed border-t border-outline-variant pt-4">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
