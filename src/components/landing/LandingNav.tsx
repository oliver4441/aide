"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import ThemeToggle from "@/components/ThemeToggle";

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
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-outline-variant bg-surface/90 shadow-lg backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5" onClick={close}>
          <img src="/logo.jpg" alt="Aide" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-headline text-lg font-bold tracking-tight text-on-surface">Aide</span>
          <span className="rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning">
            beta
          </span>
        </Link>

        <div className="hidden items-center gap-7 text-sm md:flex">
          <a href="#product" className="text-on-surface-variant transition-colors hover:text-on-surface">Product</a>
          <a href="#features" className="text-on-surface-variant transition-colors hover:text-on-surface">Features</a>
          <a href="#pricing" className="text-on-surface-variant transition-colors hover:text-on-surface">Pricing</a>
          <Link href="/help" className="text-on-surface-variant transition-colors hover:text-on-surface">Docs</Link>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface">
            Sign in
          </Link>
          <Link href="/login" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-light">
            Open Aide
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen((open) => !open)}
          className="rounded-lg p-2 text-on-surface-variant md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5M3.75 15.75h16.5" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-b border-outline-variant bg-surface/95 px-4 pb-5 backdrop-blur-xl md:hidden">
          <div className="space-y-1 pt-2">
            <a href="#product" onClick={close} className="block rounded-lg px-3 py-2.5 text-sm text-on-surface-variant">Product</a>
            <a href="#features" onClick={close} className="block rounded-lg px-3 py-2.5 text-sm text-on-surface-variant">Features</a>
            <a href="#pricing" onClick={close} className="block rounded-lg px-3 py-2.5 text-sm text-on-surface-variant">Pricing</a>
            <Link href="/help" onClick={close} className="block rounded-lg px-3 py-2.5 text-sm text-on-surface-variant">Docs</Link>
          </div>
          <div className="mt-3 flex items-center gap-3 border-t border-outline-variant pt-4">
            <ThemeToggle />
            <Link href="/login" onClick={close} className="text-sm font-medium text-on-surface-variant">Sign in</Link>
            <Link href="/login" onClick={close} className="ml-auto rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary">Open Aide</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
