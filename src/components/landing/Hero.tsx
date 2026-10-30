"use client";

import Image from "next/image";
import UiButton from "@/components/ui/UiButton";
import Container from "@/components/ui/Container";

const PHOTO_FOCUS = "50% 30%";

export default function Hero() {
  return (
    <section
      id="product"
      className="relative isolate overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40"
    >
      <Image
        src="/hero/hero-bg.jpg"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        quality={82}
        className="-z-20 select-none object-cover"
        style={{ objectPosition: PHOTO_FOCUS }}
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-ground"
      />

      <Container className="relative z-10 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 border border-accent bg-accent/10 px-3.5 py-1.5 text-xs font-display font-black text-accent">
          <span className="h-1.5 w-1.5 border border-accent text-accent" />
          Offline-first business workspace
        </div>

        <h1 className="mx-auto max-w-5xl font-display text-5xl font-black tracking-[-0.04em] text-ink sm:text-6xl md:text-7xl lg:text-[84px] lg:leading-[0.98]">
          Run your business.
          <br />
          <span className="text-accent">Even offline.</span>
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-secondary md:text-lg font-reading">
          Aide brings sales, inventory, receipts, payments and reports into one simple PWA built for small businesses. Open it in your browser, install it on your device, and keep working when the connection drops.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <UiButton href="/login" className="w-full sm:w-auto" variant="primary">
            Start free
            <span aria-hidden>→</span>
          </UiButton>
          <UiButton href="#features" variant="outline" className="w-full sm:w-auto">
            Explore the product
          </UiButton>
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-secondary font-display">
          <span>✓ Works offline</span>
          <span>✓ Installable PWA</span>
          <span>✓ KSh &amp; M-Pesa ready</span>
          <span>✓ Built for small businesses</span>
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl text-left" aria-label="Aide PWA product preview">
          <div className="relative overflow-hidden border border-rule bg-ground">
            <div className="flex items-center justify-between border-b border-rule px-4 py-3 md:px-5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 border border-danger text-danger" />
                <span className="h-2.5 w-2.5 border border-warning text-warning" />
                <span className="h-2.5 w-2.5 border border-success text-success" />
                <span className="ml-2 font-mono text-[10px] text-secondary">aide / workspace</span>
              </div>
              <span className="border border-success text-success px-2.5 py-1 text-[10px] font-display font-black">offline ready</span>
            </div>

            <div className="grid gap-0 md:grid-cols-[180px_1fr]">
              <aside className="hidden border-r border-rule bg-ground p-3 md:block">
                <div className="mb-5 px-2 text-sm font-display font-black text-ink">Aide</div>
                <div className="space-y-1 text-xs">
                  {['Overview', 'Point of sale', 'Inventory', 'Sales', 'Reports'].map((item, index) => (
                    <div key={item} className={`px-3 py-2 font-display ${index === 0 ? 'border-l-2 border-ink font-black text-ink' : 'text-secondary'}`}>
                      {item}
                    </div>
                  ))}
                </div>
              </aside>

              <div className="p-4 md:p-6 font-reading">
                <div className="flex items-end justify-between gap-4 border-b border-rule pb-2">
                  <div>
                    <p className="text-xs text-secondary">Business overview</p>
                    <h2 className="mt-1 font-display text-xl font-black text-ink md:text-2xl">Today at a glance</h2>
                  </div>
                  <span className="border border-rule text-[10px] text-secondary sm:block">Last 7 days</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    ['Sales', 'KSh 45,230', '+12.4%'],
                    ['Orders', '18', 'Today'],
                    ['Stock', '126', 'Products'],
                    ['Low stock', '4', 'Needs attention'],
                  ].map(([label, value, meta]) => (
                    <div key={label} className="border border-rule p-3.5">
                      <div className="text-[10px] font-display font-black uppercase tracking-wider text-secondary">{label}</div>
                      <div className="mt-1 text-lg font-display font-black text-ink">{value}</div>
                      <div className="mt-1 text-[9px] text-success">{meta}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_0.6fr]">
                  <div className="border border-rule p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-xs font-display font-black text-secondary">Sales activity</span>
                      <span className="text-[10px] text-secondary">KES</span>
                    </div>
                    <div className="flex h-28 items-end gap-1.5">
                      {[34, 48, 42, 65, 57, 82, 72, 92, 68, 88, 76, 96].map((height, index) => (
                        <div key={index} className="flex-1 border-l border-accent" style={{ height: `${height}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="border border-rule p-4">
                    <div className="text-xs font-display font-black text-secondary">Quick actions</div>
                    <div className="mt-3 space-y-2 text-[10px] font-display">
                      <div className="border-l-2 border-ink px-3 py-2 font-black text-ink">New sale →</div>
                      <div className="border-b border-rule px-3 py-2 text-secondary">Add product →</div>
                      <div className="border-b border-rule px-3 py-2 text-secondary">View report →</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
