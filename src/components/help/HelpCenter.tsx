"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface HelpCenterProps {
  open: boolean;
  onClose: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: "Getting Started",
    question: "How do I add products?",
    answer:
      "Go to Inventory and tap 'Add Product'. Fill in the name, price, quantity, and optional SKU. Tap Save and your product is ready to sell.",
  },
  {
    category: "Getting Started",
    question: "How do I make a sale?",
    answer:
      "Tap 'New Sale' in the sidebar. Search or tap products to add them to the cart, then tap 'Complete Sale' to finish.",
  },
  {
    category: "Getting Started",
    question: "How do I print receipts?",
    answer:
      "After completing a sale, a print button will appear. Connect a Bluetooth or thermal printer and tap Print.",
  },
  {
    category: "Getting Started",
    question: "How do I use offline mode?",
    answer:
      "Aide works offline automatically. All sales and inventory changes are saved locally and sync when you reconnect.",
  },
  {
    category: "FAQ",
    question: "How does offline mode work?",
    answer:
      "Aide uses IndexedDB to store all data locally. When you go offline, everything continues to work. When you reconnect, data syncs to the cloud automatically.",
  },
  {
    category: "FAQ",
    question: "How do I install Aide on my phone?",
    answer:
      "Open Aide in your mobile browser, tap the share icon, and select 'Add to Home Screen'. This installs it as a Progressive Web App (PWA).",
  },
  {
    category: "FAQ",
    question: "Can I use Aide on multiple devices?",
    answer:
      "Yes! Sign in on any device with your account. All data syncs across devices when connected to the internet.",
  },
  {
    category: "FAQ",
    question: "How do I export my data?",
    answer:
      "Go to Settings → Data Export. You can export your sales, inventory, and reports as CSV files.",
  },
  {
    category: "FAQ",
    question: "What happens when I lose internet?",
    answer:
      "Nothing changes — Aide continues to work fully offline. Your data is stored locally and will sync automatically when connectivity returns.",
  },
  {
    category: "FAQ",
    question: "How do I change my business settings?",
    answer:
      "Go to Settings in the sidebar. You can update your business name, tax rate, currency, and receipt preferences.",
  },
];

export default function HelpCenter({ open, onClose }: HelpCenterProps) {
  const [search, setSearch] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [helpful, setHelpful] = useState<Record<number, "yes" | "no" | null>>({});

  const filtered = useMemo(() => {
    if (!search) return faqData;
    const q = search.toLowerCase();
    return faqData.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
    );
  }, [search]);

  const toggleExpand = (idx: number) => {
    setExpandedIdx((prev) => (prev === idx ? null : idx));
  };

  const openChat = () => {
    if (typeof window !== "undefined" && (window as any).Tawk_API) {
      (window as any).Tawk_API.maximize();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-surface z-50 shadow-2xl flex flex-col border-l border-outline-variant">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="text-lg font-bold text-on-surface font-headline">
            Help Center
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-outline-variant">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search for help..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container rounded-xl border border-outline-variant text-on-surface placeholder:text-on-surface-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Quick Navigation */}
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/40 mb-2">
            Go to
          </p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { label: "Dashboard", href: "/dashboard" },
              { label: "New Sale", href: "/dashboard/pos" },
              { label: "Inventory", href: "/dashboard/inventory" },
              { label: "Sales", href: "/dashboard/sales" },
              { label: "Reports", href: "/dashboard/reports" },
              { label: "Settings", href: "/dashboard/settings" },
            ].map((nav) => (
              <Link
                key={nav.href}
                href={nav.href}
                onClick={onClose}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary/30 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-[11px] font-medium">{nav.label}</span>
              </Link>
            ))}
          </div>

          {/* Mini Business Guide */}
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/40 mb-2">
            Run your business in 5 steps
          </p>
          <div className="space-y-1.5 mb-6">
            {[
              { n: 1, title: "Add products", d: "Inventory → Add Product. Name, price, photo — SKU is auto-generated." },
              { n: 2, title: "Sell", d: "New Sale → tap items → Complete Sale. Stock deducts itself." },
              { n: 3, title: "Share the receipt", d: "Print it, or tap 'Send to Customer' so they get it on their phone." },
              { n: 4, title: "Track everything", d: "Dashboard shows live revenue & profit; Reports shows best sellers and trends." },
              { n: 5, title: "Sell offline, sync later", d: "No internet? Keep selling. Everything syncs when you reconnect — or tap 'Sync now'." },
            ].map((s) => (
              <div key={s.n} className="flex gap-3 bg-surface-container-low border border-outline-variant rounded-lg p-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  {s.n}
                </span>
                <div>
                  <p className="text-xs font-semibold text-on-surface">{s.title}</p>
                  <p className="text-[11px] text-on-surface-variant leading-snug">{s.d}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat CTA */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-on-surface font-medium mb-2">
              Can&apos;t find what you need?
            </p>
            <button
              onClick={openChat}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light transition-colors"
            >
              Chat with Us
            </button>
          </div>

          {/* FAQ Items */}
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-8">
                No results found. Try a different search.
              </p>
            )}
            {filtered.map((item, i) => {
              const globalIdx = faqData.indexOf(item);
              const isExpanded = expandedIdx === globalIdx;
              return (
                <div
                  key={globalIdx}
                  className="border border-outline-variant rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(globalIdx)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <span>{item.question}</span>
                    <svg
                      className={`w-4 h-4 text-on-surface-variant shrink-0 transition-transform ${
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
                    <div className="px-4 pb-4 text-sm text-on-surface-variant leading-relaxed border-t border-outline-variant pt-3">
                      <p>{item.answer}</p>
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-outline-variant">
                        <span className="text-xs text-on-surface-variant">
                          Was this helpful?
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setHelpful((prev) => ({
                              ...prev,
                              [globalIdx]: prev[globalIdx] === "yes" ? null : "yes",
                            }));
                          }}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                            helpful[globalIdx] === "yes"
                              ? "bg-success text-on-surface"
                              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setHelpful((prev) => ({
                              ...prev,
                              [globalIdx]: prev[globalIdx] === "no" ? null : "no",
                            }));
                          }}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                            helpful[globalIdx] === "no"
                              ? "bg-danger text-on-surface"
                              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10v9a2 2 0 01-2 2h-2.5" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
