"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCheck, Trash2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { clearNotifications } from "@/lib/notifications";
import { NotificationType } from "@/lib/db";
import { cn } from "@/lib/utils";
import UiButton from "@/components/ui/UiButton";

const dotColor: Record<NotificationType, string> = {
  sales: "bg-success",
  inventory: "bg-warning",
  customers: "bg-accent",
  system: "bg-[#3b82f6]",
  business: "bg-danger",
};

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NotificationCenterPage() {
  const router = useRouter();
  const { items, unread, markRead, markAllRead, remove } = useNotifications();

  const open = (n: (typeof items)[0]) => {
    if (!n.read) markRead(n.id);
    const route = n.data?.route;
    if (route) router.push(route);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-secondary hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <h1 className="font-display text-2xl md:text-3xl font-black text-ink">Notifications</h1>
          {items.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
              <button
                onClick={() => clearNotifications()}
                className="flex items-center gap-1 text-xs font-medium text-secondary hover:text-danger"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear all
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-secondary">{unread > 0 ? `${unread} unread` : "You're all caught up"}</p>
      </div>

      {items.length === 0 ? (
        <div className="border border-rule bg-ground p-10 text-center">
          <Bell className="w-10 h-10 mx-auto mb-3 text-secondary/40" />
          <p className="text-sm font-medium text-ink">No notifications yet</p>
          <p className="text-xs text-secondary mt-1">Alerts about sales, inventory and sync will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              onClick={() => open(n)}
              className={cn(
                "group relative flex gap-3  border border-rule bg-ground p-4 cursor-pointer transition-colors hover:bg-ground/60",
                !n.read && "border-accent/30 bg-accent/[0.04]"
              )}
            >
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotColor[n.type])} />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm leading-snug", !n.read ? "font-semibold text-ink" : "font-medium text-secondary")}>
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-secondary">{n.message}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] text-secondary/50">{timeAgo(n.createdAt)}</span>
                  {n.channel === "server" && (
                    <span className="bg-accent/10 px-1 py-0.5 text-[9px] font-medium text-accent">synced</span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  remove(n.id);
                }}
                aria-label="Dismiss"
                className="self-start p-1 text-secondary/40 opacity-0 group-hover:opacity-100 hover:text-danger transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <UiButton href="/dashboard" variant="outline" className="w-full">
        Back to dashboard
      </UiButton>
    </div>
  );
}
