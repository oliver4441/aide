"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 md:pt-40 md:pb-28 px-4 md:px-8 max-w-[1440px] mx-auto">
      <div className="absolute top-16 right-[-12%] w-[520px] h-[520px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-[-12%] w-[420px] h-[420px] rounded-full bg-primary-container/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 grid lg:grid-cols-[1fr_0.9fr] items-center gap-12 lg:gap-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Built for everyday business
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6 font-headline text-on-surface">
            Run your business.
            <br />
            <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              Even offline.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-on-surface-variant mb-8 max-w-xl leading-relaxed">
            Aide brings sales, inventory, receipts, reports, and business insights into one simple workspace. Keep working without internet and sync when you are back online.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/login"
              className="bg-primary text-on-primary font-semibold px-7 py-4 rounded-xl hover:bg-primary-light transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/10"
            >
              Start Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#features"
              className="border border-outline-variant text-on-surface font-semibold px-7 py-4 rounded-xl hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2 text-sm"
            >
              Explore Aide
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success" /> Offline-first</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success" /> M-Pesa, cash & card</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success" /> Android planned</span>
          </div>
        </div>

        <div className="relative w-full max-w-xl mx-auto">
          <div className="absolute -inset-5 rounded-[2rem] bg-primary/5 blur-2xl pointer-events-none" />
          <div className="relative bg-surface-container border border-outline-variant rounded-[1.5rem] overflow-hidden shadow-2xl shadow-primary/10">
            <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-danger/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
              </div>
              <span className="text-[10px] text-on-surface-variant font-mono">aide / overview</span>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-on-surface-variant">Good morning</p>
                  <h2 className="text-lg font-bold text-on-surface font-headline">Business overview</h2>
                </div>
                <div className="text-[10px] px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20">Offline ready</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Today&apos;s sales</div>
                  <div className="text-xl font-bold text-on-surface font-headline">KSh 45,230</div>
                  <div className="text-[10px] text-success mt-1">+12.4% vs yesterday</div>
                </div>
                <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Stock value</div>
                  <div className="text-xl font-bold text-primary font-headline">KSh 182K</div>
                  <div className="text-[10px] text-on-surface-variant mt-1">126 products</div>
                </div>
              </div>

              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-on-surface">Sales this week</span>
                  <span className="text-[10px] text-on-surface-variant">KES</span>
                </div>
                <div className="flex items-end gap-1.5 h-24">
                  {[34, 48, 42, 65, 57, 82, 72, 92, 68, 88, 76, 96].map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t bg-primary/25 last:bg-primary/80"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-surface-container-low p-3 text-center">
                  <div className="text-sm font-bold text-on-surface">18</div>
                  <div className="text-[9px] text-on-surface-variant">Orders</div>
                </div>
                <div className="rounded-xl bg-surface-container-low p-3 text-center">
                  <div className="text-sm font-bold text-on-surface">4</div>
                  <div className="text-[9px] text-on-surface-variant">Low stock</div>
                </div>
                <div className="rounded-xl bg-surface-container-low p-3 text-center">
                  <div className="text-sm font-bold text-success">89%</div>
                  <div className="text-[9px] text-on-surface-variant">Margin</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
