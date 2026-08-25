"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-surface-container-low/90 backdrop-blur-xl border-b border-outline-variant shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Aide logo" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
          <span className="text-xl font-bold text-on-surface font-headline">Aide</span>
          <span className="text-[10px] font-bold bg-warning/20 text-warning px-2 py-0.5 rounded-full ml-2">BETA</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-on-surface-variant">
          <a href="#features" className="hover:text-on-surface transition-colors">Features</a>
          <a href="#pricing" className="hover:text-on-surface transition-colors">Pricing</a>
          <a href="https://omixsystems.store" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface transition-colors">About</a>
          <a href="/help" className="hover:text-on-surface transition-colors">Help</a>
          <a href="https://omixsystems.store" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface transition-colors">API Docs</a>
          <a href="https://blog.omixsystems.store" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface transition-colors">Blog</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors px-3 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="bg-primary text-on-primary text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary-light transition-colors"
          >
            Get Started
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
            </svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-surface-container-low border-b border-outline-variant px-4 pb-4 space-y-3">
          <a href="#features" onClick={() => setMobileOpen(false)} className="block py-2 text-sm text-on-surface-variant hover:text-on-surface">Features</a>
          <a href="#pricing" onClick={() => setMobileOpen(false)} className="block py-2 text-sm text-on-surface-variant hover:text-on-surface">Pricing</a>
          <a href="https://omixsystems.store" target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)} className="block py-2 text-sm text-on-surface-variant hover:text-on-surface">About</a>
          <a href="/help" onClick={() => setMobileOpen(false)} className="block py-2 text-sm text-on-surface-variant hover:text-on-surface">Help</a>
          <a href="https://omixsystems.store" target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)} className="block py-2 text-sm text-on-surface-variant hover:text-on-surface">API Docs</a>
          <a href="https://blog.omixsystems.store" target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)} className="block py-2 text-sm text-on-surface-variant hover:text-on-surface">Blog</a>
          <div className="flex items-center gap-3 pt-2 border-t border-outline-variant">
            <ThemeToggle />
            <Link href="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-on-surface-variant hover:text-on-surface">
              Sign In
            </Link>
          </div>
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="block text-center bg-primary text-on-primary text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            Get Started
          </Link>
        </div>
      )}
    </nav>
  );
}
