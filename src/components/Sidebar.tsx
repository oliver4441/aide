"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import OnlineStatus from "@/components/OnlineStatus";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  offlineReady?: boolean;
}

const navSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard", offlineReady: true },
      { label: "New Sale", href: "/dashboard/pos", icon: "add_shopping_cart", offlineReady: true },
      { label: "Sales History", href: "/dashboard/sales", icon: "history", offlineReady: true },
    ],
  },
  {
    title: "Manage",
    items: [
      { label: "Inventory", href: "/dashboard/inventory", icon: "inventory_2", offlineReady: true },
      { label: "Reports", href: "/dashboard/reports", icon: "analytics", offlineReady: true },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: "settings", offlineReady: true },
      { label: "Help", href: "/help", icon: "help_outline", offlineReady: false },
    ],
  },
];

const iconPaths: Record<string, JSX.Element> = {
  dashboard: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  inventory_2: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  add_shopping_cart: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  ),
  history: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  analytics: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  settings: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  help_outline: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  shield: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

const mobileNavItems = [
  { label: "Home", href: "/dashboard", icon: "dashboard" },
  { label: "Sale", href: "/dashboard/pos", icon: "add_shopping_cart" },
  { label: "History", href: "/dashboard/sales", icon: "history" },
  { label: "Stock", href: "/dashboard/inventory", icon: "inventory_2" },
];

const mobileIconPaths: Record<string, JSX.Element> = {
  ...iconPaths,
  more_horizontal: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
};

const moreSheetItems = [
  { label: "Reports", href: "/dashboard/reports", icon: "analytics" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
  { label: "Help Center", href: "/help", icon: "help_outline" },
];

function OfflineBadge() {
  return (
    <span className="ml-auto flex items-center gap-1 text-[9px] font-medium text-on-surface-variant/50 bg-surface-container/40 px-1.5 py-0.5 rounded-md">
      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.242 2.829a5 5 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
      </svg>
      Offline
    </span>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: business } = useBusinessSettings();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const businessName = business?.name ?? "Aide Business";
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sections: NavSection[] = isAdmin
    ? [
        ...navSections,
        { title: "Platform", items: [{ label: "Admin Console", href: "/dashboard/admin", icon: "shield", offlineReady: false }] },
      ]
    : navSections;

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex bg-surface-container-low fixed left-0 top-0 h-screen w-[260px] border-r border-outline-variant flex-col z-40">
        {/* Brand */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/logo.jpg" alt="Aide logo" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-primary font-headline">Aide</span>
                <span className="text-[9px] font-bold tracking-wider text-on-surface-variant/50 bg-surface-container px-1.5 py-0.5 rounded">BETA</span>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <p className="text-xs text-on-surface-variant mt-2 truncate pl-[42px]">{businessName}</p>
        </div>

        {/* New Sale CTA */}
        {!isAdmin && (
          <div className="px-4 mb-2">
            <Link
              href="/dashboard/pos"
              className="w-full bg-primary text-on-primary font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm shadow-md shadow-primary/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Sale
            </Link>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="px-3 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/40">{section.title}</span>
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group ${
                        active
                          ? "bg-primary/15 text-primary border-l-2 border-primary ml-0 pl-[10px]"
                          : "text-on-surface-variant hover:bg-surface-container/50 hover:text-on-surface border-l-2 border-transparent ml-0 pl-[10px]"
                      }`}
                    >
                      <span className={`flex-shrink-0 ${active ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface"}`}>
                        {iconPaths[item.icon]}
                      </span>
                      {item.label}
                      {item.offlineReady && (
                        <OfflineBadge />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: Status + Logout */}
        <div className="border-t border-outline-variant px-4 py-3 space-y-1">
          <OnlineStatus />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-on-surface-variant hover:bg-surface-container/50 hover:text-on-surface transition-all w-full"
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Out
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-xl border-t border-outline-variant z-50 px-1 pb-safe">
        <div className="flex items-center justify-around h-14">
          {mobileNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[52px] ${
                  active ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                <span className={active ? "text-primary" : "text-on-surface-variant"}>
                  {mobileIconPaths[item.icon]}
                </span>
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[52px] ${
              moreOpen || ["/dashboard/reports", "/dashboard/settings", "/help"].some((h) => isActive(h))
                ? "text-primary"
                : "text-on-surface-variant"
            }`}
            aria-label="More navigation"
          >
            {mobileIconPaths.more_horizontal}
            <span className="text-[9px] font-medium">More</span>
          </button>
        </div>

        {/* More Sheet */}
        {moreOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setMoreOpen(false)} />
            <div className="fixed bottom-14 left-0 right-0 bg-surface-container-low border-t border-outline-variant rounded-t-2xl z-[55] p-4 pb-6 shadow-2xl animate-fade-in">
              <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mb-4" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/40 mb-2 px-1">Navigate</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(isAdmin
                  ? [...moreSheetItems, { label: "Admin", href: "/dashboard/admin", icon: "shield" }]
                  : moreSheetItems
                ).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${
                      isActive(item.href)
                        ? "bg-primary/15 text-primary"
                        : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {mobileIconPaths[item.icon]}
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log Out
              </button>
            </div>
          </>
        )}
      </nav>
    </>
  );
}
