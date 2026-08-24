"use client";

import Link from "next/link";
import FAQSection from "@/components/help/FAQSection";
import ContactSection from "@/components/help/ContactSection";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-outline-variant bg-surface/95 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-primary font-headline">Aide</span>
          </Link>
          <Link
            href="/login"
            className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light transition-colors"
          >
            Open App
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-on-surface font-headline mb-4">
            Help Center
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            Everything you need to get started with Aide, manage your business, and make the most of our features.
          </p>
        </div>

        {/* Getting Started */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-on-surface font-headline mb-6">
            Getting Started
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Add Products",
                desc: "Go to Inventory → Add Product. Enter name, price, and quantity to get started.",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                ),
              },
              {
                title: "Make a Sale",
                desc: "Tap New Sale, add products to cart, and complete the transaction.",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                ),
              },
              {
                title: "Print Receipts",
                desc: "After a sale, tap Print to generate a receipt via Bluetooth or thermal printer.",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                ),
              },
              {
                title: "Offline Mode",
                desc: "Aide works without internet. All data saves locally and syncs when you reconnect.",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 00-7.072 0 5 5 0 000 7.072M12 12h.01" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-surface-container border border-outline-variant rounded-xl p-5"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-3">
                  {item.icon}
                </div>
                <h3 className="text-on-surface font-semibold text-sm mb-1">
                  {item.title}
                </h3>
                <p className="text-on-surface-variant text-xs leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <div className="mb-16">
          <FAQSection />
        </div>

        {/* Contact */}
        <div className="mb-16">
          <ContactSection />
        </div>

        {/* Quick Links */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-on-surface font-headline mb-6">
            Quick Links
          </h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "App Features", href: "/#features" },
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "Visit OmixSystems", href: "https://omixsystems.store" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-container border border-outline-variant rounded-lg px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
              >
                {link.label} →
              </a>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-outline-variant py-8 text-center text-on-surface-variant text-sm">
        <p>© 2026 OmixSystems. All rights reserved.</p>
      </footer>
    </div>
  );
}
