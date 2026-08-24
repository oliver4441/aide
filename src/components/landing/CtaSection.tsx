"use client";

import Link from "next/link";
import ScrollFadeIn from "./ScrollFadeIn";

export default function CtaSection() {
  return (
    <section className="py-24 px-4 md:px-8 max-w-4xl mx-auto">
      <ScrollFadeIn>
        <div className="bg-primary rounded-2xl p-8 md:p-16 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-on-primary mb-4 font-headline">
              Ready to take control?
            </h2>
            <p className="text-on-primary/80 text-lg mb-8 max-w-xl mx-auto">
              Join hundreds of businesses streamlining their operations with Aide. No credit card required.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-on-primary text-primary font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity"
            >
              Get Started Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="text-xs text-on-primary/50 mt-4">14-day free trial &bull; Cancel anytime</p>
          </div>
        </div>
      </ScrollFadeIn>
    </section>
  );
}
