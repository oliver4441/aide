"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-24 md:pt-44 md:pb-32 px-4 md:px-8 max-w-[1440px] mx-auto">
      <div className="absolute top-0 right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[-10%] w-[400px] h-[400px] rounded-full bg-primary-container/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 md:gap-16">
        <div className="flex-1 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Offline-first business management that actually works
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 font-headline text-on-surface">
            One Platform.
            <br />
            <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              Total Control.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-on-surface-variant mb-8 max-w-lg leading-relaxed">
            Streamline your inventory, accelerate sales, and unlock deep analytics from any device. Built for modern entrepreneurs.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/login"
              className="bg-primary text-on-primary font-semibold px-8 py-4 rounded-xl hover:bg-primary-light transition-colors flex items-center justify-center gap-2 text-sm"
            >
              Get Started Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#features"
              className="border border-outline-variant text-on-surface-variant font-semibold px-8 py-4 rounded-xl hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2 text-sm"
            >
              See Features
            </a>
          </div>
        </div>

        <div className="flex-1 w-full max-w-lg">
          <div className="bg-surface-container border border-outline-variant rounded-2xl overflow-hidden shadow-2xl shadow-primary/5">
            <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-danger/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <span className="text-[10px] text-on-surface-variant font-mono">aide-dashboard</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Today&apos;s Sales</div>
                  <div className="text-lg font-bold text-on-surface font-headline">KSh 45,230</div>
                  <div className="text-[10px] text-success">+12%</div>
                </div>
                <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Products</div>
                  <div className="text-lg font-bold text-primary font-headline">12</div>
                  <div className="text-[10px] text-on-surface-variant">in stock</div>
                </div>
              </div>
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3">
                <div className="flex items-end gap-1.5 h-16">
                  {[30, 50, 40, 70, 60, 85, 55, 90, 75, 95, 65, 80].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t transition-all duration-500"
                      style={{
                        height: `${h}%`,
                        backgroundColor: i >= 10 ? "rgb(var(--primary) / 0.8)" : "rgb(var(--primary) / 0.25)",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Profit Margin</div>
                  <div className="text-lg font-bold text-success font-headline">89%</div>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
