"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setMobileOpen(false);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 bg-ground ${
        scrolled ? "border-b border-rule" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5" onClick={close}>
          <span className="font-display text-xl font-black tracking-tight text-ink">Aide</span>
        </Link>

        <div className="hidden items-center gap-7 text-sm md:flex font-display">
          <a href="#product" className="text-secondary hover:text-ink hover:underline">Product</a>
          <a href="#features" className="text-secondary hover:text-ink hover:underline">Features</a>
          <a href="#pricing" className="text-secondary hover:text-ink hover:underline">Variants</a>
          <Link href="/downloads" className="text-secondary hover:text-ink hover:underline">Get the app</Link>
          <Link href="/docs" className="text-secondary hover:text-ink hover:underline">Docs</Link>
          <Link href="/help" className="text-secondary hover:text-ink hover:underline">Help</Link>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Link href="/login" className="np-btn">Sign in</Link>
          <Link href="/login" className="np-btn np-btn--accent">Open Aide</Link>
        </div>

        <button
          onClick={() => setMobileOpen((open) => !open)}
          className="np-btn p-2 md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5M3.75 15.75h16.5" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-rule px-4 pb-5">
          <div className="space-y-1 pt-2 font-display">
            <a href="#product" onClick={close} className="block border-b border-rule/60 py-2.5 text-secondary">Product</a>
            <a href="#features" onClick={close} className="block border-b border-rule/60 py-2.5 text-secondary">Features</a>
            <a href="#pricing" onClick={close} className="block border-b border-rule/60 py-2.5 text-secondary">Variants</a>
            <Link href="/downloads" onClick={close} className="block border-b border-rule/60 py-2.5 text-secondary">Get the app</Link>
            <Link href="/docs" onClick={close} className="block border-b border-rule/60 py-2.5 text-secondary">Docs</Link>
            <Link href="/help" onClick={close} className="block border-b border-rule/60 py-2.5 text-secondary">Help</Link>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" onClick={close} className="np-btn">Sign in</Link>
            <Link href="/login" onClick={close} className="np-btn np-btn--accent ml-auto">Open Aide</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
