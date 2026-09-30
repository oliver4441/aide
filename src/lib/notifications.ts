import db, { NotificationRecord, NotificationType, NotificationPrefRecord } from "./db";

export type { NotificationRecord, NotificationType } from "./db";

export const NOTIFICATION_CATEGORIES: { type: NotificationType; label: string; hint: string }[] = [
  { type: "sales", label: "Sales", hint: "Sale completed, refunds, payments received" },
  { type: "inventory", label: "Inventory", hint: "Low stock, out of stock, stock adjustments" },
  { type: "customers", label: "Customers", hint: "New customer, customer activity" },
  { type: "system", label: "System", hint: "Sync completed/failed, backups, security" },
  { type: "business", label: "Business", hint: "Daily summary, reports, business alerts" },
];

const PREF_ENABLED = "enabled";

export async function isNotificationsEnabled(): Promise<boolean> {
  const row = await db.notificationPrefs.get(PREF_ENABLED);
  return row ? row.value : true; // default on
}

export async function setNotificationsEnabled(value: boolean) {
  await db.notificationPrefs.put({ key: PREF_ENABLED, value } satisfies NotificationPrefRecord);
}

export async function isCategoryEnabled(type: NotificationType): Promise<boolean> {
  const row = await db.notificationPrefs.get(type);
  if (row) return row.value;
  return true; // default on for every category
}

export async function setCategoryEnabled(type: NotificationType, value: boolean) {
  await db.notificationPrefs.put({ key: type, value } satisfies NotificationPrefRecord);
}

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `n_${Date.now()}_${Math.random().toString(36).slice(2)}`);

export async function addNotification(partial: {
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  businessId?: string;
}): Promise<NotificationRecord | null> {
  const isOn = await isNotificationsEnabled();
  const catOn = await isCategoryEnabled(partial.type);
  if (!isOn || !catOn) return null;

  const record: NotificationRecord = {
    id: uid(),
    type: partial.type,
    channel: "local",
    title: partial.title,
    message: partial.message,
    data: partial.data,
    read: false,
    createdAt: new Date().toISOString(),
    businessId: partial.businessId,
  };

  // Cap the local notification store.
  const count = await db.notifications.count();
  if (count >= 200) {
    const oldest = await db.notifications.orderBy("createdAt").first();
    if (oldest) await db.notifications.delete(oldest.id);
  }

  await db.notifications.add(record);
  return record;
}

export async function markNotificationRead(id: string) {
  await db.notifications.update(id, { read: true });
}

export async function markAllNotificationsRead() {
  await db.notifications.toCollection().modify({ read: true });
}

export async function deleteNotification(id: string) {
  await db.notifications.delete(id);
}

export async function clearNotifications() {
  await db.notifications.clear();
}

const LAST_SYNC_KEY = "aide_notif_last_sync";

/**
 * Reconcile local notification state with the server:
 *  - push locally-read server notifications so reads propagate across devices
 *  - pull server-born notifications created since our last sync
 */
export async function syncNotificationsWithServer(): Promise<number> {
  try {
    const businessId = typeof localStorage !== "undefined" ? localStorage.getItem("aide_business_id") || undefined : undefined;

    // Locally-read server notifications (idempotent — server just re-marks read).
    const locals = await db.notifications.filter((n) => n.channel === "server" && n.read).toArray();
    const readIds = locals.map((n) => n.id);
    const deletedIds: string[] = [];

    const lastSync = typeof localStorage !== "undefined" ? localStorage.getItem(LAST_SYNC_KEY) : null;
    const since = lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const res = await fetch("/api/notifications/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ readIds, deletedIds, since, businessId }),
    });
    if (!res.ok) return 0;

    const data = await res.json();
    const incoming: NotificationRecord[] = data.notifications ?? [];

    let added = 0;
    for (const n of incoming) {
      const exists = await db.notifications.get(n.id);
      if (exists) continue;
      await db.notifications.add({
        id: n.id,
        businessId: n.businessId,
        type: n.type,
        channel: n.channel ?? "server",
        title: n.title,
        message: n.message,
        data: n.data ?? undefined,
        read: Boolean(n.read),
        createdAt: n.createdAt,
        expiresAt: n.expiresAt ?? undefined,
        deletedAt: n.deletedAt ?? undefined,
      });
      added++;
    }

    if (data.serverNow && typeof localStorage !== "undefined") {
      localStorage.setItem(LAST_SYNC_KEY, data.serverNow);
    }
    return added;
  } catch {
    return 0;
  }
}
