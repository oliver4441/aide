"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { NotificationRecord, NotificationType } from "@/lib/db";
import {
  addNotification,
  deleteNotification,
  isNotificationsEnabled,
  markAllNotificationsRead,
  markNotificationRead,
  setNotificationsEnabled,
} from "@/lib/notifications";

export function useNotifications() {
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  const items = useLiveQuery(
    () => db.notifications.orderBy("createdAt").reverse().limit(60).toArray(),
    [],
    [] as NotificationRecord[]
  );

  const unread = useLiveQuery(
    () => db.notifications.filter((n) => !n.read).count(),
    [],
    0
  );

  useEffect(() => {
    let mounted = true;
    isNotificationsEnabled().then((v) => {
      if (!mounted) return;
      setEnabled(v);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Seed low-stock alerts once when the user first opens the dashboard.
  useEffect(() => {
    if (!enabled) return;
    let seeded = false;
    (async () => {
      const products = await db.products.filter((p) => p.isActive).toArray();
      const low = products.filter((p) => p.quantity <= p.lowStock && !p.isService);
      if (low.length === 0) return;

      const last = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recent = await db.notifications.filter((n) => n.type === "inventory").toArray();
      const exists = recent.some((n) => n.createdAt >= last && n.title.includes("low stock"));
      if (!exists && !seeded) {
        seeded = true;
        await addNotification({
          type: "inventory",
          title: `${low.length} item${low.length > 1 ? "s" : ""} low in stock`,
          message: low.slice(0, 3).map((p) => p.name).join(", ") + (low.length > 3 ? ` +${low.length - 3} more` : ""),
          data: { route: "/dashboard/inventory" },
        });
      }
    })();
  }, [enabled]);

  const toggleEnabled = useCallback(async (v: boolean) => {
    await setNotificationsEnabled(v);
    setEnabled(v);
  }, []);

  const markRead = useCallback((id: string) => {
    markNotificationRead(id);
  }, []);

  const markAllRead = useCallback(() => {
    markAllNotificationsRead();
  }, []);

  const remove = useCallback((id: string) => {
    deleteNotification(id);
  }, []);

  return {
    items,
    unread,
    enabled,
    ready,
    toggleEnabled,
    markRead,
    markAllRead,
    remove,
    notify: addNotification,
  };
}

export type { NotificationType };
