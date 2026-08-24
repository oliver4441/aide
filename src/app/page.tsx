"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const features = [
  {
    title: "Real-time Inventory",
    description: "Never guess stock levels again. Track products, receive low-stock alerts, and manage categories effortlessly.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    span: "md:col-span-2",
    visual: "inventory",
  },
  {
    title: "Swift Point of Sale",
    description: "Process transactions in seconds. Support Cash, M-Pesa, and Card payments with automatic stock deduction.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
    span: "md:col-span-1",
    visual: "pos",
  },
  {
    title: "Deep Analytics",
    description: "Turn raw data into actionable insights with dashboards that track revenue, profit, and top products.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    span: "md:col-span-1",
    visual: "analytics",
  },
  {
    title: "Cloud Sync & PWA",
    description: "Your data is secure and accessible from any device. Install as a PWA for an app-like experience.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    span: "md:col-span-2",
    visual: "cloud",
  },
];

const industries = [
  { name: "Boutiques", description: "Manage sizes, colors, and seasonal collections.", icon: "👗" },
  { name: "Tech Shops", description: "Track serial numbers, warranties, and repairs.", icon: "💻" },
  { name: "Salons & Spas", description: "Manage staff schedules, commissions, and clients.", icon: "💅" },
  { name: "Groceries", description: "Track perishable stock, bulk items, and pricing.", icon: "🥬" },
  { name: "Pharmacies", description: "Manage prescriptions, expiry dates, and batches.", icon: "💊" },
  { name: "Restaurants", description: "Track ingredients, menu items, and daily specials.", icon: "🍽️" },
  { name: "Electronics", description: "Track serial numbers, warranties, and repairs.", icon: "🔧" },
  { name: "Service Centers", description: "Schedule appointments and track labor hours.", icon: "🛠️" },
];

const testimonials = [
  { name: "Grace Wanjiku", role: "Salon Owner, Nairobi", quote: "Aide transformed how I manage Beauty Hub. I went from notebooks to a real system in minutes." },
  { name: "James Kiprop", role: "Electronics Shop, Kericho", quote: "Finally a POS that works on my phone without needing an expensive device. Game changer." },
  { name: "Faith Nyambura", role: "Boutique, Nakuru", quote: "The inventory alerts alone saved me from stockouts three times this month." },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Nav */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-dark-surface/95 backdrop-blur-xl border-b border-dark-border shadow-lg" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white font-[family-name:var(--font-headline)]">Aide</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#industries" className="hover:text-white transition-colors">Solutions</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors px-3 py-2">
              Log In
            </Link>
            <Link
              href="/login"
              className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary-light transition-colors shadow-lg shadow-primary/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-32 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Background blobs */}
        <div className="absolute top-0 right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-[-10%] w-[400px] h-[400px] rounded-full bg-primary-container/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <div className="flex-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Built for modern entrepreneurs
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 font-[family-name:var(--font-headline)]">
              One Platform.
              <br />
              <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
                Total Control.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 mb-8 max-w-lg leading-relaxed">
              Streamline your inventory, accelerate sales, and unlock deep analytics from any device. Built for shops, salons, and businesses across Kenya.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="bg-primary text-white font-semibold px-8 py-4 rounded-xl hover:bg-primary-light transition-colors shadow-xl shadow-primary/25 flex items-center justify-center gap-2 text-sm"
              >
                Get Started for Free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#features"
                className="border border-zinc-700 text-zinc-300 font-semibold px-8 py-4 rounded-xl hover:bg-zinc-800/50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                See Features
              </a>
            </div>
            <div className="mt-10 flex items-center gap-4 text-sm text-zinc-500">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary-container/30 border-2 border-dark-bg flex items-center justify-center text-[10px] font-bold text-primary">
                    {["G", "J", "F"][i - 1]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-400 text-xs">
                  {"★★★★★".split("").map((s, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                <span>Powering 500+ businesses</span>
              </div>
            </div>
          </div>

          {/* Hero Visual - Dashboard Preview */}
          <div className="flex-1 w-full max-w-lg">
            <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden shadow-2xl shadow-primary/5">
              <div className="px-4 py-3 border-b border-dark-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <span className="text-[10px] text-zinc-600 font-mono">aide-dashboard</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900/50 border border-dark-border rounded-xl p-3">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Today&apos;s Sales</div>
                    <div className="text-lg font-bold text-white font-[family-name:var(--font-headline)]">KSh 12,450</div>
                    <div className="text-[10px] text-emerald-400">+12% ↑</div>
                  </div>
                  <div className="bg-zinc-900/50 border border-dark-border rounded-xl p-3">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Profit</div>
                    <div className="text-lg font-bold text-emerald-400 font-[family-name:var(--font-headline)]">KSh 8,340</div>
                    <div className="text-[10px] text-zinc-500">67% margin</div>
                  </div>
                </div>
                {/* Mini chart bars */}
                <div className="bg-zinc-900/50 border border-dark-border rounded-xl p-3">
                  <div className="flex items-end gap-1.5 h-16">
                    {[30, 50, 40, 70, 60, 85, 55, 90, 75, 95, 65, 80].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t transition-all duration-500"
                        style={{
                          height: `${h}%`,
                          backgroundColor: i === 10 || i === 11 ? "rgba(111, 38, 79, 0.8)" : "rgba(111, 38, 79, 0.25)",
                        }}
                      />
                    ))}
                  </div>
                </div>
                {/* Recent items */}
                <div className="space-y-2">
                  {["Keratin Treatment ×1", "Hair Serum ×2", "Styling Gel ×3"].map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-zinc-900/30 rounded-lg">
                      <span className="text-xs text-zinc-400">{item}</span>
                      <span className="text-xs font-bold text-white font-mono">
                        KSh {[2800, 1700, 960][i].toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="border-y border-dark-border py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-6 font-semibold">Trusted by businesses across Kenya</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-30">
            {["Beauty Hub", "TechCore", "Brewed", "Verity", "Aura", "Lumina"].map((name) => (
              <span key={name} className="text-sm font-bold text-zinc-400 font-[family-name:var(--font-headline)]">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-[family-name:var(--font-headline)]">
            Engineered for Efficiency
          </h2>
          <p className="text-zinc-400 text-lg">
            Everything you need to run your business seamlessly, in an interface you&apos;ll love using every day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={i}
              className={`bg-dark-surface border border-dark-border rounded-2xl p-6 md:p-8 hover:border-primary/30 transition-all group ${f.span}`}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-[family-name:var(--font-headline)]">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.description}</p>

              {/* Feature visual */}
              <div className="mt-6 bg-zinc-900/50 border border-dark-border rounded-xl p-4 h-28 flex items-center justify-center">
                {f.visual === "inventory" && (
                  <div className="w-full space-y-2">
                    {["Argan Serum — 15", "Keratin Kit — 8", "Hair Spray — 22"].map((item, j) => (
                      <div key={j} className="flex justify-between items-center px-3 py-1.5 bg-zinc-800/50 rounded-lg">
                        <span className="text-[11px] text-zinc-400">{item.split(" — ")[0]}</span>
                        <span className={`text-[11px] font-bold ${parseInt(item.split(" — ")[1]) <= 8 ? "text-amber-400" : "text-emerald-400"}`}>
                          {item.split(" — ")[1]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {f.visual === "pos" && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-2xl font-bold text-primary font-[family-name:var(--font-headline)]">KSh 2,800</div>
                    <div className="flex gap-1">
                      {["Cash", "M-Pesa", "Card"].map((m, j) => (
                        <span key={j} className={`text-[10px] px-2 py-0.5 rounded-full ${j === 1 ? "bg-primary text-white" : "bg-zinc-800 text-zinc-500"}`}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {f.visual === "analytics" && (
                  <div className="flex items-end gap-1.5 h-full w-full">
                    {[20, 35, 25, 50, 40, 65, 55, 80, 70, 90].map((h, j) => (
                      <div key={j} className="flex-1 bg-primary/30 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                )}
                {f.visual === "cloud" && (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-20 bg-zinc-800 border border-dark-border rounded-lg flex items-center justify-center -rotate-6 group-hover:rotate-0 transition-transform">
                      <div className="w-3 h-3 rounded-full bg-primary/40" />
                    </div>
                    <div className="w-16 h-20 bg-zinc-800 border border-dark-border rounded-lg flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
                      <div className="w-8 h-4 bg-zinc-700 rounded" />
                    </div>
                    <div className="w-12 h-20 bg-zinc-800 border border-dark-border rounded-lg flex items-center justify-center rotate-6 group-hover:rotate-0 transition-transform">
                      <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="py-24 bg-dark-surface border-y border-dark-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-[family-name:var(--font-headline)]">
              Adaptable to Your Industry
            </h2>
            <p className="text-zinc-400 text-lg">
              Designed with a flexible core to handle the unique demands of diverse business models.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {industries.map((ind, i) => (
              <div
                key={i}
                className="bg-dark-bg border border-dark-border rounded-2xl p-5 text-center hover:border-primary/40 transition-all group cursor-pointer"
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{ind.icon}</div>
                <h4 className="text-sm font-bold text-white mb-1">{ind.name}</h4>
                <p className="text-xs text-zinc-500 hidden md:block">{ind.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-[family-name:var(--font-headline)]">
            Loved by Business Owners
          </h2>
          <p className="text-zinc-400 text-lg">
            See what entrepreneurs across Kenya are saying about Aide.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-dark-surface border border-dark-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-1 text-amber-400 text-sm mb-4">{"★★★★★"}</div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">&quot;{t.quote}&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-xs text-zinc-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-dark-surface border-y border-dark-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-[family-name:var(--font-headline)]">
              Simple, Transparent Pricing
            </h2>
            <p className="text-zinc-400 text-lg">
              Start free. Upgrade when you&apos;re ready. No hidden fees.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Starter */}
            <div className="bg-dark-bg border border-dark-border rounded-2xl p-6">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Starter</div>
              <div className="text-3xl font-bold text-white font-[family-name:var(--font-headline)] mb-1">Free</div>
              <div className="text-sm text-zinc-500 mb-6">forever</div>
              <ul className="space-y-3 text-sm text-zinc-400 mb-6">
                {["1 business", "Up to 50 products", "Basic POS", "Sales history"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block text-center py-2.5 rounded-xl border border-dark-border text-zinc-300 text-sm font-semibold hover:bg-zinc-800/50 transition-colors">
                Get Started
              </Link>
            </div>
            {/* Pro */}
            <div className="bg-dark-bg border border-primary/40 rounded-2xl p-6 relative shadow-xl shadow-primary/5">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Pro</div>
              <div className="text-3xl font-bold text-white font-[family-name:var(--font-headline)] mb-1">KSh 999</div>
              <div className="text-sm text-zinc-500 mb-6">per month</div>
              <ul className="space-y-3 text-sm text-zinc-400 mb-6">
                {["5 businesses", "Unlimited products", "Advanced POS", "Reports & analytics", "Low stock alerts", "Priority support"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block text-center py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light transition-colors shadow-lg shadow-primary/20">
                Start Free Trial
              </Link>
            </div>
            {/* Enterprise */}
            <div className="bg-dark-bg border border-dark-border rounded-2xl p-6">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Enterprise</div>
              <div className="text-3xl font-bold text-white font-[family-name:var(--font-headline)] mb-1">Custom</div>
              <div className="text-sm text-zinc-500 mb-6">tailored for you</div>
              <ul className="space-y-3 text-sm text-zinc-400 mb-6">
                {["Unlimited businesses", "Multi-location", "Staff management", "API access", "Custom integrations", "Dedicated support"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block text-center py-2.5 rounded-xl border border-dark-border text-zinc-300 text-sm font-semibold hover:bg-zinc-800/50 transition-colors">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 md:px-8 max-w-4xl mx-auto">
        <div className="bg-primary rounded-2xl p-8 md:p-16 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-[family-name:var(--font-headline)]">
              Ready to take total control?
            </h2>
            <p className="text-primary-container/80 text-lg mb-8 max-w-xl mx-auto">
              Join hundreds of businesses streamlining their operations with Aide. No credit card required.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-xl hover:bg-zinc-100 transition-colors shadow-lg"
            >
              Get Started for Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="text-xs text-primary-container/50 mt-4">14-day free trial • Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-surface border-t border-dark-border pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-white font-[family-name:var(--font-headline)]">Aide</span>
              </div>
              <p className="text-sm text-zinc-500 max-w-xs">
                The elegant, powerful platform designed to help modern businesses thrive.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-dark-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-zinc-600">&copy; 2026 Aide. All rights reserved.</p>
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest">Built by Omix Systems</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
