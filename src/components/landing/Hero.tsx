"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section id="product" className="relative overflow-hidden px-4 pb-20 pt-32 md:px-8 md:pb-28 md:pt-40">
      <div className="pointer-events-none absolute left-1/2 top-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-primary/10 blur-[150px]" />
      <div className="relative z-10 mx-auto max-w-[1180px] text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Offline-first business workspace
        </div>

        <h1 className="mx-auto max-w-5xl font-headline text-5xl font-bold tracking-[-0.04em] text-on-surface sm:text-6xl md:text-7xl lg:text-[84px] lg:leading-[0.98]">
          Run your business.
          <br />
          <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">Even offline.</span>
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-on-surface-variant md:text-lg">
          Aide brings sales, inventory, receipts, payments and reports into one simple PWA built for small businesses. Open it in your browser, install it on your device, and keep working when the connection drops.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/login" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-on-primary shadow-lg shadow-primary/10 transition hover:bg-primary-light sm:w-auto">
            Start free
            <span aria-hidden>→</span>
          </Link>
          <a href="#features" className="inline-flex w-full items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low px-6 py-3.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container sm:w-auto">
            Explore the product
          </a>
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-on-surface-variant">
          <span>✓ Works offline</span>
          <span>✓ Installable PWA</span>
          <span>✓ KSh &amp; M-Pesa ready</span>
          <span>✓ Built for small businesses</span>
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl text-left" aria-label="Aide PWA product preview">
          <div className="absolute -inset-8 rounded-[2rem] bg-primary/5 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3 md:px-5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <span className="ml-2 font-mono text-[10px] text-on-surface-variant">aide / workspace</span>
              </div>
              <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[10px] font-medium text-success">offline ready</span>
            </div>

            <div className="grid gap-0 md:grid-cols-[180px_1fr]">
              <aside className="hidden border-r border-outline-variant bg-surface-container-low p-3 md:block">
                <div className="mb-5 px-2 text-sm font-bold text-on-surface">Aide</div>
                <div className="space-y-1 text-xs">
                  {['Overview', 'Point of sale', 'Inventory', 'Sales', 'Reports'].map((item, index) => (
                    <div key={item} className={`rounded-lg px-3 py-2 ${index === 0 ? 'bg-primary/10 font-semibold text-primary' : 'text-on-surface-variant'}`}>
                      {item}
                    </div>
                  ))}
                </div>
              </aside>

              <div className="p-4 md:p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-on-surface-variant">Business overview</p>
                    <h2 className="mt-1 font-headline text-xl font-bold text-on-surface md:text-2xl">Today at a glance</h2>
                  </div>
                  <span className="hidden rounded-lg border border-outline-variant px-3 py-2 text-[10px] text-on-surface-variant sm:block">Last 7 days</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    ['Sales', 'KSh 45,230', '+12.4%'],
                    ['Orders', '18', 'Today'],
                    ['Stock', '126', 'Products'],
                    ['Low stock', '4', 'Needs attention'],
                  ].map(([label, value, meta]) => (
                    <div key={label} className="rounded-xl border border-outline-variant bg-surface-container-low p-3.5">
                      <div className="text-[10px] uppercase tracking-wider text-on-surface-variant">{label}</div>
                      <div className="mt-1 text-lg font-bold text-on-surface">{value}</div>
                      <div className="mt-1 text-[9px] text-success">{meta}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_0.6fr]">
                  <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-xs font-semibold text-on-surface">Sales activity</span>
                      <span className="text-[10px] text-on-surface-variant">KES</span>
                    </div>
                    <div className="flex h-28 items-end gap-1.5">
                      {[34, 48, 42, 65, 57, 82, 72, 92, 68, 88, 76, 96].map((height, index) => (
                        <div key={index} className="flex-1 rounded-t bg-primary/25 last:bg-primary/80" style={{ height: `${height}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                    <div className="text-xs font-semibold text-on-surface">Quick actions</div>
                    <div className="mt-3 space-y-2 text-[10px]">
                      <div className="rounded-lg bg-primary/10 px-3 py-2 font-medium text-primary">New sale →</div>
                      <div className="rounded-lg border border-outline-variant px-3 py-2 text-on-surface-variant">Add product →</div>
                      <div className="rounded-lg border border-outline-variant px-3 py-2 text-on-surface-variant">View report →</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center font-mono text-[10px] text-on-surface-variant/60">The PWA keeps the core workflow available locally, then syncs when connectivity returns.</p>
        </div>
      </div>
    </section>
  );
}
