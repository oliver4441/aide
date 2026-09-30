"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingCart,
  History,
  Package,
  BarChart3,
  Settings,
  HelpCircle,
  Shield,
  MoreHorizontal,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
      { label: "New Sale", href: "/dashboard/pos", icon: "sale", offlineReady: true },
      { label: "Sales History", href: "/dashboard/sales", icon: "history", offlineReady: true },
    ],
  },
  {
    title: "Manage",
    items: [
      { label: "Inventory", href: "/dashboard/inventory", icon: "stock", offlineReady: true },
      { label: "Reports", href: "/dashboard/reports", icon: "reports", offlineReady: true },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: "settings", offlineReady: true },
      { label: "Help", href: "/help", icon: "help", offlineReady: false },
    ],
  },
];

const navIcons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  sale: ShoppingCart,
  history: History,
  stock: Package,
  reports: BarChart3,
  settings: Settings,
  help: HelpCircle,
  shield: Shield,
  more: MoreHorizontal,
} as const;

const mobileNavItems = [
  { label: "Home", href: "/dashboard", icon: "dashboard" },
  { label: "Sale", href: "/dashboard/pos", icon: "sale" },
  { label: "History", href: "/dashboard/sales", icon: "history" },
  { label: "Stock", href: "/dashboard/inventory", icon: "stock" },
];

const moreSheetItems = [
  { label: "Reports", href: "/dashboard/reports", icon: "reports" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
  { label: "Help Center", href: "/help", icon: "help" },
];

function NavIcon({ name, className = "w-[18px] h-[18px]" }: { name: string; className?: string }) {
  const Icon = navIcons[name];
  if (!Icon) return null;
  return <Icon className={className} strokeWidth={1.8} />;
}

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

  const moreItems = isAdmin
    ? [...moreSheetItems, { label: "Admin", href: "/dashboard/admin", icon: "shield" }]
    : moreSheetItems;

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
              <ShoppingCart className="w-4 h-4" strokeWidth={2.5} />
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
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group border-l-2",
                        active
                          ? "bg-primary/15 text-primary border-primary pl-[10px]"
                          : "text-on-surface-variant hover:bg-surface-container/50 hover:text-on-surface border-transparent pl-[10px]"
                      )}
                    >
                      <span className={cn("flex-shrink-0", active ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface")}>
                        <NavIcon name={item.icon} />
                      </span>
                      {item.label}
                      {item.offlineReady && <OfflineBadge />}
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
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
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
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[52px]",
                  active ? "text-primary" : "text-on-surface-variant"
                )}
              >
                <span className={active ? "text-primary" : "text-on-surface-variant"}>
                  <NavIcon name={item.icon} className="w-[20px] h-[20px]" />
                </span>
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[52px]",
              moreOpen || ["/dashboard/reports", "/dashboard/settings", "/help", "/dashboard/admin"].some((h) => isActive(h))
                ? "text-primary"
                : "text-on-surface-variant"
            )}
            aria-label="More navigation"
          >
            <NavIcon name="more" className="w-[20px] h-[20px]" />
            <span className="text-[9px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Animated More Sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-[54] md:hidden"
              onClick={() => setMoreOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="fixed bottom-14 left-0 right-0 md:hidden bg-surface-container-low border-t border-outline-variant rounded-t-2xl z-[55] p-4 pb-6 shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
            >
              <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mb-4" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/40 mb-2 px-1">Navigate</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {moreItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors",
                      isActive(item.href)
                        ? "bg-primary/15 text-primary"
                        : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    <NavIcon name={item.icon} className="w-[20px] h-[20px]" />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.8} />
                Log Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
