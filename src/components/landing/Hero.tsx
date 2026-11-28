"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import Container from "@/components/ui/Container";

const metrics = [
  ["38%", "fewer stock-out losses"],
  ["4.8 / 5", "owner rating"],
  ["48h", "to get up and running"],
  ["100%", "offline capable"],
];

interface StoryBeat {
  id: string;
  label: string;
  badge: string;
  headlineTop: string;
  headlineAccent: string;
  pitch: string;
  url: string;
  status: string;
}

const beats: StoryBeat[] = [
  {
    id: "overview",
    label: "Overview",
    badge: "Offline-first workspace",
    headlineTop: "Run your business.",
    headlineAccent: "Even offline.",
    pitch:
      "Sales, stock, receipts and reports in one workspace. Keep serving customers when the internet drops; Aide syncs your changes when you reconnect.",
    url: "aide.app / dashboard",
    status: "● Offline ready",
  },
  {
    id: "pos",
    label: "Point of sale",
    badge: "Fast counter till",
    headlineTop: "Ring up sales.",
    headlineAccent: "In seconds.",
    pitch:
      "Search products, attach customers, and take Cash, M-Pesa or Card. Every sale deducts stock automatically and generates a QR receipt.",
    url: "aide.app / pos",
    status: "● Shift open",
  },
  {
    id: "inventory",
    label: "Inventory",
    badge: "Stock & bulk import",
    headlineTop: "Every shelf.",
    headlineAccent: "Accounted for.",
    pitch:
      "Auto-generated SKUs, low-stock alerts before fast movers run out, and one-click CSV or Excel import for existing catalogues.",
    url: "aide.app / inventory",
    status: "● 126 items tracked",
  },
  {
    id: "reports",
    label: "Financials",
    badge: "Reports & accounting",
    headlineTop: "Clear numbers.",
    headlineAccent: "Ready to act on.",
    pitch:
      "Follow daily revenue, payment breakdowns, journal entries and year-end closing — or export clean CSV and JSON for your accountant.",
    url: "aide.app / financials",
    status: "● Books balanced",
  },
];

function OverviewScreen() {
  const bars = [38, 55, 42, 68, 51, 78, 60, 88, 70, 96, 73, 84];
  return (
    <div className="grid min-h-[296px] md:grid-cols-[142px_1fr]">
      <aside className="hidden border-r border-[#262b33] p-3 md:block">
        <div className="mb-5 px-2 font-display text-sm font-bold text-[#f5f6f7]">
          Aide<span className="text-[#2e5bff]">.</span>
        </div>
        {[
          ["▦", "Overview"],
          ["▣", "New sale"],
          ["◇", "Inventory"],
          ["◷", "Shifts"],
          ["▤", "Reports"],
          ["◈", "Financials"],
        ].map(([icon, label], i) => (
          <div
            key={label}
            className={`mb-1 flex items-center gap-2 rounded-md px-2.5 py-2 font-display text-[10px] ${
              i === 0 ? "bg-[#202329] text-[#f5f6f7]" : "text-[#88909a]"
            }`}
          >
            <span className="text-xs">{icon}</span>
            {label}
          </div>
        ))}
      </aside>
      <div className="p-4 sm:p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-[10px] text-[#8f98a3]">Business overview</p>
            <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-[#f5f6f7]">
              Today at a glance
            </h3>
          </div>
          <span className="rounded-md border border-[#262b33] px-2 py-1 font-display text-[9px] text-[#aab1ba]">
            Last 7 days ⌄
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Sales", "KSh 45,230", "+12.4%"],
            ["Orders", "18", "Today"],
            ["Stock", "126", "Products"],
            ["Low stock", "4", "Needs attention"],
          ].map(([label, value, meta]) => (
            <div key={label} className="rounded-lg border border-[#262b33] bg-[#17191e] p-3">
              <p className="font-display text-[9px] text-[#8f98a3]">{label}</p>
              <p className="mt-1 font-display text-base font-semibold tabular-nums tracking-tight text-[#f5f6f7] sm:text-lg">
                {value}
              </p>
              <p className="mt-1 font-display text-[9px] tabular-nums text-[#6ed19d]">{meta}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1.5fr_0.8fr]">
          <div className="rounded-lg border border-[#262b33] bg-[#17191e] p-3">
            <div className="mb-3 flex justify-between font-display text-[10px] text-[#aab1ba]">
              <span>Sales activity</span>
              <span>KES</span>
            </div>
            <div className="relative flex h-[86px] items-end gap-1 border-b border-[#30343c] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_27px,#262b33_28px)] px-1">
              {bars.map((height, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-[2px]"
                  style={{
                    height: `${height}%`,
                    background: i === 9 ? "#2e5bff" : "rgba(46,91,255,.45)",
                  }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between font-display text-[8px] text-[#747d87]">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
          <div className="hidden rounded-lg border border-[#262b33] bg-[#17191e] p-3 sm:block">
            <p className="font-display text-[10px] text-[#aab1ba]">Quick actions</p>
            <div className="mt-2 space-y-1.5 font-display text-[9px]">
              <div className="rounded-md bg-[#202329] px-2.5 py-2 text-[#f5f6f7]">
                ＋ New sale <span className="float-right text-[#78818c]">↗</span>
              </div>
              <div className="px-2.5 py-1.5 text-[#aab1ba]">＋ Add product</div>
              <div className="px-2.5 py-1.5 text-[#aab1ba]">Import CSV</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PosScreen() {
  return (
    <div className="grid min-h-[296px] sm:grid-cols-[1.2fr_0.8fr]">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-[10px] text-[#8f98a3]">Point of sale</p>
            <h3 className="mt-1 font-display text-base font-semibold text-[#f5f6f7]">
              Tap items to bill
            </h3>
          </div>
          <span className="rounded-md border border-[#262b33] px-2.5 py-1 font-display text-[9px] text-[#aab1ba]">
            ⌕ Search SKU
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {[
            ["Arabica coffee 250g", "KSh 850", "24 left"],
            ["Kericho black tea", "KSh 320", "41 left"],
            ["Raw acacia honey", "KSh 690", "12 left"],
            ["Fresh milk 1L", "KSh 160", "30 left"],
          ].map(([name, price, stock]) => (
            <div
              key={name}
              className="rounded-lg border border-[#262b33] bg-[#17191e] p-3"
            >
              <div className="flex items-center justify-between">
                <span className="h-2 w-2 rounded-full bg-[#2e5bff]" />
                <span className="font-display text-[8px] text-[#747d87]">{stock}</span>
              </div>
              <p className="mt-2 truncate font-display text-[11px] font-medium text-[#f5f6f7]">
                {name}
              </p>
              <p className="mt-1 font-display text-xs font-semibold tabular-nums text-[#aab1ba]">
                {price}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col border-t border-[#262b33] bg-[#17191e] p-4 sm:border-l sm:border-t-0 sm:p-5">
        <div className="flex items-center justify-between border-b border-[#262b33] pb-2.5">
          <span className="font-display text-xs font-semibold text-[#f5f6f7]">Current cart</span>
          <span className="rounded-full bg-[#202329] px-2 py-0.5 font-display text-[9px] text-[#aab1ba]">
            M-Pesa
          </span>
        </div>
        <div className="mt-3 space-y-2.5 font-display text-[10px] tabular-nums">
          <div className="flex justify-between text-[#aab1ba]">
            <span>Arabica coffee × 2</span>
            <span className="text-[#f5f6f7]">KSh 1,700</span>
          </div>
          <div className="flex justify-between text-[#aab1ba]">
            <span>Kericho tea × 1</span>
            <span className="text-[#f5f6f7]">KSh 320</span>
          </div>
          <div className="flex justify-between text-[#747d87]">
            <span>VAT (16% incl.)</span>
            <span>KSh 279</span>
          </div>
        </div>
        <div className="mt-auto border-t border-[#262b33] pt-3">
          <div className="flex items-baseline justify-between font-display tabular-nums">
            <span className="text-[10px] text-[#8f98a3]">Total</span>
            <span className="text-lg font-semibold text-[#f5f6f7]">KSh 2,020</span>
          </div>
          <div className="mt-2.5 rounded-full bg-[#2e5bff] py-2 text-center font-display text-[10px] font-semibold text-white">
            Complete sale &amp; QR receipt →
          </div>
        </div>
      </div>
    </div>
  );
}

function InventoryScreen() {
  return (
    <div className="min-h-[296px] p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-[#262b33] pb-3.5">
        <div>
          <p className="font-display text-[10px] text-[#8f98a3]">Inventory &amp; CSV Import</p>
          <h3 className="mt-1 font-display text-base font-semibold text-[#f5f6f7]">
            Catalogue <span className="ml-1 font-normal tabular-nums text-[#747d87]">126 SKUs</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#262b33] px-3 py-1 font-display text-[9px] text-[#aab1ba]">
            ↑ Import CSV
          </span>
          <span className="rounded-full bg-[#2e5bff] px-3 py-1 font-display text-[9px] font-semibold text-white">
            ＋ Add product
          </span>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {[
          ["Arabica coffee 250g", "Grocery · GRO-1042", "KSh 850", "24 units", "In stock", true],
          ["Shea butter 200ml", "Beauty · BEA-2098", "KSh 1,200", "3 units", "Low stock", false],
          ["Mineral water 500ml", "Drinks · DRI-3115", "KSh 60", "48 units", "In stock", true],
          ["Hair treatment mask", "Salon · SAL-4012", "Service", "No tracking", "Active", true],
        ].map(([name, meta, price, qty, status, ok]) => (
          <div
            key={String(name)}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg border border-[#262b33] bg-[#17191e] px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate font-display text-[11px] font-medium text-[#f5f6f7]">
                {name}
              </p>
              <p className="mt-0.5 font-display text-[9px] text-[#747d87]">{meta}</p>
            </div>
            <p className="font-display text-[11px] font-semibold tabular-nums text-[#d9dce0]">
              {price}
            </p>
            <div className="text-right">
              <p className="font-display text-[10px] tabular-nums text-[#aab1ba]">{qty}</p>
              <p
                className={`mt-0.5 font-display text-[8px] ${
                  ok ? "text-[#6ed19d]" : "text-[#f1b65c]"
                }`}
              >
                ● {status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinancialsScreen() {
  return (
    <div className="min-h-[296px] p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-[#262b33] pb-3.5">
        <div>
          <p className="font-display text-[10px] text-[#8f98a3]">Reports &amp; Financials</p>
          <h3 className="mt-1 font-display text-base font-semibold text-[#f5f6f7]">
            Monthly performance
          </h3>
        </div>
        <span className="rounded-full border border-[#262b33] px-3 py-1 font-display text-[9px] text-[#aab1ba]">
          Export CSV / PDF
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[
          ["Gross revenue", "KSh 412,800", "+18.2%"],
          ["Net profit", "KSh 138,450", "33.5% margin"],
          ["M-Pesa share", "62%", "KSh 255,936"],
        ].map(([label, val, sub]) => (
          <div key={label} className="rounded-lg border border-[#262b33] bg-[#17191e] p-3">
            <p className="font-display text-[9px] text-[#8f98a3]">{label}</p>
            <p className="mt-1 font-display text-sm font-semibold tabular-nums text-[#f5f6f7] sm:text-base">
              {val}
            </p>
            <p className="mt-1 font-display text-[9px] tabular-nums text-[#6ed19d]">{sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-[#262b33] bg-[#17191e] p-3.5">
        <div className="flex items-center justify-between font-display text-[10px] text-[#aab1ba]">
          <span>Payment breakdown &amp; ledger</span>
          <span className="text-[#747d87]">FY 2026</span>
        </div>
        <div className="mt-3 space-y-2.5">
          {[
            ["M-Pesa Till", "62%", "KSh 255,936"],
            ["Cash Drawer", "26%", "KSh 107,328"],
            ["Card & Bank", "12%", "KSh 49,536"],
          ].map(([method, pct, amount]) => (
            <div key={method}>
              <div className="flex justify-between font-display text-[10px] tabular-nums">
                <span className="text-[#d9dce0]">{method}</span>
                <span className="text-[#8f98a3]">
                  {amount} ({pct})
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[#262b33]">
                <div className="h-1.5 rounded-full bg-[#2e5bff]" style={{ width: pct }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const screens = [OverviewScreen, PosScreen, InventoryScreen, FinancialsScreen];

export default function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % beats.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const beat = beats[activeIndex];

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="product"
        className="relative overflow-hidden pb-12 pt-28 sm:pt-32 lg:pb-16 lg:pt-36"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-10 h-[620px] w-[720px] rounded-full bg-[#2e5bff]/[0.11] blur-[140px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 bottom-0 h-[360px] w-[420px] rounded-full bg-[#2e5bff]/[0.05] blur-[120px]"
        />

        <Container wide className="relative">
          <div className="grid items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14">
            <div className="max-w-[540px]">
              {/* Interactive story beat pills */}
              <div
                className="mb-6 flex flex-wrap items-center gap-1.5"
                role="tablist"
                aria-label="Product walkthrough"
              >
                {beats.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveIndex(idx)}
                      className={`relative overflow-hidden rounded-full border px-3 py-1.5 font-display text-[11px] font-medium transition active:scale-[0.98] ${
                        isActive
                          ? "border-accent/60 bg-accent/15 text-ink"
                          : "border-rule bg-[#14161a] text-secondary hover:border-ink/30 hover:text-ink"
                      }`}
                    >
                      <span className="relative z-10 flex items-center gap-1.5">
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Switching pitch copy synced to the active cascade */}
              <div className="min-h-[208px] sm:min-h-[224px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={beat.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="mb-3 font-display text-[11px] font-medium uppercase tracking-[.14em] text-accent">
                      {beat.badge}
                    </p>
                    <h1 className="text-balance font-display text-[clamp(3rem,5.8vw,5rem)] font-semibold leading-[.99] tracking-[-.065em] text-ink">
                      {beat.headlineTop}
                      <br />
                      <span className="text-accent">{beat.headlineAccent}</span>
                    </h1>
                    <p className="mt-5 max-w-[470px] text-pretty font-reading text-base leading-7 text-secondary sm:text-[17px]">
                      {beat.pitch}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-3 rounded-full bg-accent px-6 py-3.5 font-display text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
                >
                  Start free <span aria-hidden="true">↗</span>
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-full border border-rule px-6 py-3.5 font-display text-sm font-medium text-ink transition hover:bg-[#181b20] active:scale-[0.98]"
                >
                  Explore the product
                </a>
              </div>
              <p className="mt-5 font-display text-[11px] text-[#858e99]">
                Web, Android, Windows, macOS &amp; Linux · Works online and offline.
              </p>
            </div>

            {/* Cascading dashboard preview stack */}
            <div className="relative lg:pl-2">
              <div className="relative h-[380px] sm:h-[395px]">
                {beats.map((item, idx) => {
                  const offset = (idx - activeIndex + beats.length) % beats.length;
                  const Screen = screens[idx];
                  const isFront = offset === 0;
                  // Cascade cards behind the active one with subtle vertical offset & scale
                  const translateY = offset * 14;
                  const scale = 1 - offset * 0.035;
                  const opacity = isFront ? 1 : Math.max(0.18, 0.72 - offset * 0.22);
                  const zIndex = beats.length - offset;

                  return (
                    <motion.div
                      key={item.id}
                      onClick={() => !isFront && setActiveIndex(idx)}
                      initial={false}
                      animate={{
                        y: translateY,
                        scale,
                        opacity,
                        zIndex,
                      }}
                      transition={{
                        duration: 0.55,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{ originY: 0 }}
                      className={`absolute inset-x-0 top-0 overflow-hidden rounded-xl border border-[#262b33] bg-[#14161a] shadow-[0_32px_100px_-35px_rgba(0,0,0,.85)] ${
                        isFront ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <div className="flex h-11 items-center justify-between border-b border-[#262b33] px-4">
                        <div className="flex items-center gap-1.5">
                          <i className="h-2 w-2 rounded-full bg-[#393e46]" />
                          <i className="h-2 w-2 rounded-full bg-[#393e46]" />
                          <i className="h-2 w-2 rounded-full bg-[#393e46]" />
                          <span className="ml-3 font-display text-[10px] text-[#7e8792]">
                            {item.url}
                          </span>
                        </div>
                        <span className="rounded-full border border-[#285a47] bg-[#14251e] px-2.5 py-1 font-display text-[9px] text-[#72d4a4]">
                          {item.status}
                        </span>
                      </div>
                      <Screen />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-rule pt-6 sm:grid-cols-4 lg:mt-16">
            {metrics.map(([value, label]) => (
              <div key={value}>
                <p className="font-display text-[22px] font-semibold tabular-nums tracking-[-.04em] text-ink sm:text-2xl">
                  {value}
                </p>
                <p className="mt-1 font-reading text-xs text-secondary sm:text-[13px]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </MotionConfig>
  );
}
