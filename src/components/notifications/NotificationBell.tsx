"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";
import { clearNotifications } from "@/lib/notifications";
import { NotificationType } from "@/lib/db";

const dotColor: Record<NotificationType, string> = {
  sales: "border-success",
  inventory: "border-warning",
  customers: "border-accent",
  system: "border-ink",
  business: "border-error",
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

const emptyState = (
  <div className="px-6 py-10 text-center text-secondary font-display">
    <span className="text-2xl">🔔</span>
    <p className="mt-2">You&apos;re all caught up</p>
    <p className="text-[10px] mt-1">New alerts will appear here</p>
  </div>
);

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { items, unread, markRead, markAllRead, remove } = useNotifications();

  const openAtIndex = (n: (typeof items)[0]) => {
    if (!n.read) markRead(n.id);
    setOpen(false);
    const route = n.data?.route;
    if (route) router.push(route);
  };

  return (
    <>
      {/* Bell trigger — square, ruled */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center border border-rule bg-ground text-secondary hover:text-ink font-display"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] border border-rule bg-error text-ground text-[10px] font-black flex items-center justify-center px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-[71] w-[min(92vw,360px)] border border-rule bg-ground">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-rule px-4 py-3 font-display">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <span className="text-sm font-black text-ink">Notifications</span>
                {unread > 0 && (
                  <span className="border border-rule bg-error text-ground text-[10px] font-black px-1.5 py-0.5">
                    {unread} new
                  </span>
                )}
              </div>
              {items.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs font-black text-accent"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[min(60vh,420px)] overflow-y-auto">
              {items.length === 0 ? (
                emptyState
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => openAtIndex(n)}
                    className={`group relative flex gap-3 border-b border-rule px-4 py-3 cursor-pointer ${!n.read ? "border-l-2 border-l-accent" : ""}`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 border rounded-full ${dotColor[n.type]}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] ${!n.read ? "font-black text-ink" : "font-display text-secondary"}`}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-secondary">{n.message}</p>
                      <span className="mt-1 block text-[10px] text-secondary">{timeAgo(n.createdAt)}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(n.id);
                      }}
                      aria-label="Dismiss"
                      className="self-start text-secondary opacity-0 group-hover:opacity-100 hover:text-error p-1"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-rule font-display">
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center gap-1.5 border-b border-rule py-2.5 text-xs font-black text-ink"
                >
                  View all notifications
                </Link>
                <button
                  onClick={() => clearNotifications()}
                  className="flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-black text-secondary hover:text-error"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
