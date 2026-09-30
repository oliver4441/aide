"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { clearNotifications } from "@/lib/notifications";
import { NotificationType } from "@/lib/db";
import { cn } from "@/lib/utils";

const dotColor: Record<NotificationType, string> = {
  sales: "bg-success",
  inventory: "bg-warning",
  customers: "bg-primary",
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

const emptyState = (
  <div className="px-6 py-10 text-center">
    <Bell className="w-8 h-8 mx-auto mb-2 text-on-surface-variant/40" />
    <p className="text-sm text-on-surface-variant">You&apos;re all caught up</p>
    <p className="text-xs text-on-surface-variant/60 mt-1">New alerts will appear here</p>
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
      {/* Bell trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] rounded-full bg-danger text-on-error-container text-[10px] font-bold flex items-center justify-center px-1 shadow">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
            <motion.div
              className="absolute right-0 top-12 z-[71] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-on-surface">Notifications</span>
                  {unread > 0 && (
                    <span className="rounded-full bg-danger/10 text-danger text-[10px] font-semibold px-1.5 py-0.5">
                      {unread} new
                    </span>
                  )}
                </div>
                {items.length > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
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
                      className={cn(
                        "group relative flex gap-3 border-b border-outline-variant/50 px-4 py-3 cursor-pointer transition-colors hover:bg-surface-container/60",
                        !n.read && "bg-primary/[0.04]"
                      )}
                    >
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotColor[n.type])} />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-[13px] leading-snug", !n.read ? "font-semibold text-on-surface" : "font-medium text-on-surface-variant")}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-on-surface-variant">{n.message}</p>
                        <span className="mt-1 block text-[10px] text-on-surface-variant/50">{timeAgo(n.createdAt)}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(n.id);
                        }}
                        aria-label="Dismiss"
                        className="self-start rounded-md p-1 text-on-surface-variant/40 opacity-0 group-hover:opacity-100 hover:text-danger transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <button
                  onClick={() => clearNotifications()}
                  className="flex w-full items-center justify-center gap-1.5 border-t border-outline-variant py-2.5 text-xs font-medium text-on-surface-variant hover:text-danger hover:bg-surface-container/50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear all notifications
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
