"use client";

import Link from "next/link";
import Container from "@/components/ui/Container";

export default function CtaSection() {
  return (
    <section className="border-t border-rule border-b border-rule py-16">
      <Container wide>
        <div className="border border-rule p-8 md:p-16 text-center">
          <img
            src="/logo.jpg"
            alt="Aide logo"
            className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-5 object-cover border border-rule"
          />
          <h2 className="font-display text-3xl md:text-4xl font-black text-ink mb-4">
            Ready to take control?
          </h2>
          <p className="font-reading text-secondary text-lg mb-8 max-w-xl mx-auto">
            Set up your business, load your stock and start selling. Aide runs in your browser and keeps working when the connection drops.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 np-btn np-btn--accent font-display font-black px-8 py-4"
          >
            Get Started Free
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="font-reading text-xs text-secondary mt-4">Free while in beta &bull; No card required</p>
        </div>
      </Container>
    </section>
  );
}