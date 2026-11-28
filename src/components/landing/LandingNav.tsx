"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  ["Product", "#product"],
  ["Features", "#features"],
  ["Pricing", "#pricing"],
  ["FAQ", "#faq"],
  ["Docs", "/docs"],
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const close = () => setMobileOpen(false);
  return (
    <nav className={`fixed inset-x-0 top-0 z-50 border-b transition-colors ${scrolled || mobileOpen ? "border-rule bg-ground/95 backdrop-blur-xl" : "border-transparent bg-ground/70 backdrop-blur-md"}`}>
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 md:px-8">
        <Link href="/" onClick={close} aria-label="Aide home" className="font-display text-[22px] font-bold tracking-[-0.06em] text-ink">Aide<span className="text-accent">.</span></Link>
        <div className="hidden items-center gap-8 font-display text-[13px] md:flex">
          {links.map(([label, href]) => <a key={label} href={href} className="text-secondary transition hover:text-ink">{label}</a>)}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="rounded-full px-4 py-2 font-display text-[13px] text-secondary transition hover:text-ink active:scale-[0.98]">Sign in</Link>
          <Link href="/login" className="rounded-full bg-accent px-5 py-2.5 font-display text-[13px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98]">Open Aide <span aria-hidden="true">↗</span></Link>
        </div>
        <button type="button" onClick={() => setMobileOpen((open) => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rule text-ink md:hidden" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">{mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />}</svg>
        </button>
      </div>
      {mobileOpen && <div className="border-t border-rule bg-ground px-5 pb-5 pt-3 md:hidden">
        <div className="flex flex-col">{links.map(([label, href]) => <a key={label} href={href} onClick={close} className="border-b border-rule py-3 font-display text-sm text-secondary">{label}</a>)}</div>
        <div className="mt-4 flex gap-3"><Link href="/login" onClick={close} className="flex-1 rounded-full border border-rule py-3 text-center font-display text-sm text-ink">Sign in</Link><Link href="/login" onClick={close} className="flex-1 rounded-full bg-accent py-3 text-center font-display text-sm font-semibold text-white">Open Aide ↗</Link></div>
      </div>}
    </nav>
  );
}
