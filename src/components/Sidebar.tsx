"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
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
  Calculator,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import OnlineStatus from "@/components/OnlineStatus";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";

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
      { label: "Calculator", href: "/dashboard/calculator", icon: "calculator", offlineReady: true },
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
  calculator: Calculator,
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
  { label: "Calculator", href: "/dashboard/calculator", icon: "calculator" },
  { label: "Help Center", href: "/help", icon: "help" },
];

function NavIcon({ name, className = "w-[18px] h-[18px]" }: { name: string; className?: string }) {
  const Icon = navIcons[name];
  if (!Icon) return null;
  return <Icon className={className} strokeWidth={1.8} />;
}

function OfflineBadge() {
  return (
    <span className="ml-auto flex items-center gap-1 text-[9px] font-medium text-secondary border border-rule px-1.5 py-0.5">
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
  const { collapsed, toggle: toggleCollapsed } = useSidebarCollapsed();

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
      <nav
        className={cn(
          "hidden md:flex bg-ground fixed left-0 top-0 h-screen border-r border-rule flex-col z-40",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Brand */}
        <div className={cn("pt-5 pb-4 border-b border-rule", collapsed ? "px-2" : "px-5")}>
          <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "justify-between")}>
            <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5")}>
              <img src="/logo.jpg" alt="Aide logo" className="w-8 h-8 object-cover" />
              {!collapsed && (
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-base font-black tracking-tight text-ink">Aide</span>
                </div>
              )}
            </div>
            <button
              onClick={toggleCollapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "w-8 h-8 flex items-center justify-center text-secondary hover:text-ink hover:bg-ground transition-none",
                collapsed && "mx-auto"
              )}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
          {!collapsed && (
            <p className="text-xs text-secondary mt-2 truncate pl-[42px]">{businessName}</p>
          )}
        </div>

        {/* New Sale CTA */}
        {!isAdmin && (
          <div className={cn("mb-2 border-b border-rule px-3 py-2", collapsed ? "px-2" : "px-4")}>
            <Link
              href="/dashboard/pos"
              title={collapsed ? "New Sale" : undefined}
              className={cn(
                "np-btn np-btn--accent font-semibold py-2.5 flex items-center justify-center gap-2 text-sm",
                collapsed ? "rounded-none px-0 w-full" : "rounded-none w-full"
              )}
            >
              <ShoppingCart className="w-4 h-4" strokeWidth={2.5} />
              {!collapsed && "New Sale"}
            </Link>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="px-3 mb-1.5">
                <span className="font-display text-[10px] font-black uppercase tracking-widest text-secondary">{section.title}</span>
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-none text-[13px] font-medium border-l-2",
                        active
                          ? "bg-accent/10 text-accent border-accent pl-2"
                          : "text-secondary hover:bg-rule/20 hover:text-ink border-transparent pl-2"
                      )}
                    >
                      <span className={cn("flex-shrink-0", active ? "text-accent" : "text-secondary group-hover:text-ink")}>
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
        <div className="border-t border-rule px-4 py-3 space-y-1">
          <OnlineStatus />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="np-btn w-full justify-start gap-2.5 px-3 py-2 text-[13px] font-medium text-secondary hover:bg-ink hover:text-ground"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
            Log Out
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Nav — ruled, square */}
      <nav
        className="md:hidden fixed bottom-4 left-4 right-4 z-50"
        aria-label="Primary navigation"
      >
        <div className="flex items-center justify-between gap-2 border border-rule bg-ground px-3 py-2">
          {/* Left group: Home, Sale */}
          <div className="flex items-center gap-1">
            {mobileNavItems.slice(0, 2).map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-none transition-none min-w-[48px]",
                    active ? "text-accent bg-accent/10" : "text-secondary"
                  )}
                >
                  <span className={active ? "text-accent" : "text-secondary"}>
                    <NavIcon name={item.icon} className="w-[22px] h-[22px]" />
                  </span>
                  <span className="font-display text-[9px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Center: More button */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-none transition-none min-w-[40px]",
              moreOpen
                ? "bg-accent text-ground"
                : "text-secondary hover:text-accent hover:bg-accent/10"
            )}
            aria-label={moreOpen ? "Close menu" : "More navigation"}
            aria-expanded={moreOpen}
          >
            <NavIcon
              name={moreOpen ? "plus" : "more"}
              className={cn("w-[24px] h-[24px]")}
            />
          </button>

          {/* Right group: History, Stock */}
          <div className="flex items-center gap-1">
            {mobileNavItems.slice(2).map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-none transition-none min-w-[48px]",
                    active ? "text-accent bg-accent/10" : "text-secondary"
                  )}
                >
                  <span className={active ? "text-accent" : "text-secondary"}>
                    <NavIcon name={item.icon} className="w-[22px] h-[22px]" />
                  </span>
                  <span className="font-display text-[9px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* More Sheet — no animation */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 bg-ink/50 z-[54] md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="fixed bottom-14 left-0 right-0 md:hidden bg-ground border-t border-rule rounded-none z-[55] p-4 pb-6"
          >
            <div className="w-10 h-1 bg-rule mx-auto mb-4" />
            <p className="font-display text-[10px] font-black uppercase tracking-widest text-secondary mb-2 px-1">Navigate</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3 rounded-none transition-none",
                    isActive(item.href)
                      ? "bg-accent/10 text-accent"
                      : "bg-ground text-secondary hover:text-ink"
                  )}
                >
                  <NavIcon name={item.icon} className="w-[20px] h-[20px]" />
                  <span className="font-display text-[11px] font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="np-btn w-full justify-center gap-2 py-2.5 text-sm font-medium text-secondary"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.8} />
              Log Out
            </button>
          </div>
        </>
      )}
    </>
  );
}