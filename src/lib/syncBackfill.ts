/**
 * Sync backfill + reconciliation helpers.
 *
 * Adds a deterministic backfill pass that retries stuck/failed outbox items
 * (`status` in `'pending' | 'retry'`) and quarantines items that exceed the
 * retry budget.
 */

import db, { SyncQueueItem } from './db';
import { syncEngine } from './sync';

function activeBusinessId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('aide_business_id') ?? '';
}

export type SyncTable = 'products' | 'categories' | 'sales' | 'saleItems';

export interface BackfillOptions {
  /** Milliseconds to wait before treating a pending item as stuck. */
  retryThresholdMs?: number;
  /** How many push attempts are allowed before a queue item is quarantined. */
  maxAttempts?: number;
  /** The queue item status after it has exhausted the retry budget. */
  quarantinedStatus?: 'quarantined';
  /** How long quarantined items stay marked for review before you can clear them. */
  quarantineDays?: number;
  /** If true, print a single-line summary to the console for debugging. */
  debug?: boolean;
}

export interface BackfillResult {
  attempts: number;
  synced: number;
  conflicts: number;
  quarantined: number;
  failed: number;
  queued: number;
  message: string;
}

function toDate(iso: string | undefined | null): Date {
  return new Date(iso || 0);
}

function isoNow(): string {
  return new Date().toISOString();
}

// Prevents overlapping backfill runs from piling up on component re-mounts.
let runningBackfill = false;

export async function countPendingSyncQueue(): Promise<number> {
  try {
    return await db.syncQueue.where('status').anyOf(['pending', 'retry']).count();
  } catch {
    return 0;
  }
}

export async function quarantineStaleItems(options: {
  thresholdMs?: number;
  maxAttempts?: number;
  quarantinedStatus?: 'quarantined';
}): Promise<number> {
  const thresholdMs = options.thresholdMs ?? 60 * 60 * 1000;
  const maxAttempts = options.maxAttempts ?? 5;
  const quarantinedStatus = options.quarantinedStatus ?? 'quarantined';

  const cutoffMs = Date.now() - thresholdMs;

  const stale = await db.syncQueue
    .where('status')
    .anyOf(['pending', 'retry'])
    .and((item) => toDate(item.updatedAt || item.timestamp).getTime() < cutoffMs)
    .toArray();

  let quarantined = 0;
  for (const item of stale) {
    if (item.action === 'delete') continue;
    const attempts = Number(item.attempts ?? 0);
    if (attempts >= maxAttempts) {
      await db.syncQueue.update(item.key!, {
        status: quarantinedStatus,
        updatedAt: isoNow(),
        attempts: attempts + 1,
      });
      quarantined++;
    }
  }

  return quarantined;
}

export async function processStaleQueue(options: BackfillOptions = {}): Promise<BackfillResult> {
  if (runningBackfill) {
    return {
      attempts: 0,
      synced: 0,
      conflicts: 0,
      quarantined: 0,
      failed: 0,
      queued: 0,
      message: 'backfill already running',
    };
  }
  runningBackfill = true;
  try {
    const {
      retryThresholdMs = 60 * 60 * 1000,
      maxAttempts = 5,
      quarantinedStatus = 'quarantined',
      quarantineDays = 7,
      debug = false,
    } = options;

    const now = Date.now();
    const cutoffMs = now - retryThresholdMs;

    const pending = await db.syncQueue
      .where('status')
      .anyOf(['pending', 'retry'])
      .and((item) => toDate(item.updatedAt || item.timestamp).getTime() < cutoffMs)
      .toArray();

    let attempts = 0;
    let synced = 0;
    let conflicts = 0;
    let quarantined = 0;
    let failed = 0;

    for (const item of pending) {
      if (item.status === 'quarantined' || item.status === 'synced') continue;

      attempts++;
      const attemptsSoFar = Number(item.attempts ?? 0);

      try {
        const pushRes = await processOneMutation(item);
        conflicts += pushRes.conflicts.length;
        if (pushRes.synced) {
          synced++;
          continue;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isAuthError = /\b(401|403)\b|Unauthorized|Forbidden/i.test(msg);
        if (isAuthError) {
          failed++;
          continue;
        }
      }

      const nextAttempts = attemptsSoFar + 1;
      const isQuarantine = nextAttempts >= maxAttempts;

      if (isQuarantine) {
        await db.syncQueue.update(item.key!, {
          status: quarantinedStatus,
          attempts: nextAttempts,
          updatedAt: isoNow(),
        });
        await db.syncConflicts.put({
          id: `${item.table}_${item.recordId}_${isoNow()}_${nextAttempts}`,
          entityType: item.table,
          entityId: item.recordId,
          clientData: item.data,
          serverData: null,
          resolution: 'manual-review',
          status: 'PENDING_OWNER',
          businessId: activeBusinessId(),
          createdAt: isoNow(),
          resolvedAt: undefined,
          quarantineUntil: new Date(now + quarantineDays * 24 * 60 * 60 * 1000).toISOString(),
        } as any);
        quarantined++;
        failed++;
      } else {
        await db.syncQueue.update(item.key!, {
          status: 'retry',
          attempts: nextAttempts,
          updatedAt: isoNow(),
        });
        failed++;
      }
    }

    const queued = await countPendingSyncQueue();
    const message =
      `backfill: synced=${synced}, conflicts=${conflicts}, quarantined=${quarantined}, failed=${failed}, remaining=${queued}`;

    if (debug) {
      console.log(message);
    }

    return { attempts, synced, conflicts, quarantined, failed, queued, message };
  } finally {
    runningBackfill = false;
  }
}

async function processOneMutation(item: SyncQueueItem): Promise<{ synced: boolean; conflicts: any[] }> {
  if (!syncEngine.getStatus().isOnline) return { synced: false, conflicts: [] };

  const deviceId =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('aide_device_id') ?? ''
      : '';
  const businessId = activeBusinessId() || undefined;

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId, mutations: [item], deviceId }),
  });

  if (!res.ok) {
    throw new Error(`Sync failed: ${res.status}`);
  }

  const result = await res.json();
  const conflicts: any[] = result.conflicts ?? [];

  if (conflicts.length > 0) {
    await db.syncConflicts.bulkPut(conflicts);
  }

  const failedList: any[] = Array.isArray(result.failed) ? result.failed : [];
  const itemFailed = failedList.some(
    (f) => f.table === item.table && f.recordId === item.recordId
  );

  const synced: number = result.synced ?? 0;
  if (synced > 0 && !itemFailed) {
    await db.syncQueue.delete(item.key!);
    return { synced: true, conflicts };
  }

  return { synced: false, conflicts };
}

export async function reconcileFromServer(options: {
  businessId?: string;
  pull?: boolean;
  push?: boolean;
  debug?: boolean;
}): Promise<{ pulled: number; pushed: number; conflicts: number; quarantined: number }> {
  const { businessId, pull = true, push = true, debug = false } = options;

  let pulled = 0;
  let pushed = 0;
  let conflicts = 0;
  let quarantined = 0;

  if (push) {
    const pushedResult = await syncEngine.push();
    pushed = pushedResult.synced ?? 0;
    conflicts = (pushedResult.conflicts ?? []).length;
    if (debug) {
      console.log(`push: synced=${pushed}, conflicts=${conflicts}`);
    }
  }

  if (pull) {
    const business = businessId ?? localStorage.getItem('aide_business_id');
    if (!business) {
      if (debug) {
        console.log('pull: no active businessId');
      }
      return { pulled: 0, pushed, conflicts, quarantined };
    }

    const lastSync = localStorage.getItem('aide_last_sync') || '0';
    const pulledResult = await pullFromServer(business, lastSync);
    pulled = pulledResult;
  }

  quarantined = await countQuarantined();

  return { pulled, pushed, conflicts, quarantined };
}

async function pullFromServer(
  businessId: string,
  since: string,
): Promise<number> {
  const res = await fetch(`/api/sync?since=${encodeURIComponent(since)}&businessId=${encodeURIComponent(businessId)}`);

  if (!res.ok) {
    throw new Error(`Pull failed: ${res.status}`);
  }

  const result = await res.json();
  let count = 0;

  if (result.business) {
    await db.businesses.put(result.business);
  }
  if (result.products) {
    const records = result.products.map((p: any) => ({ ...p, syncStatus: 'synced' as const }));
    await db.products.bulkPut(records);
    count += records.length;
  }
  if (result.categories) {
    const records = result.categories.map((c: any) => ({ ...c, syncStatus: 'synced' as const }));
    await db.categories.bulkPut(records);
    count += records.length;
  }
  if (result.sales) {
    const records = result.sales.map((s: any) => ({ ...s, syncStatus: 'synced' as const }));
    await db.sales.bulkPut(records);
    count += records.length;
  }
  if (result.saleItems) {
    await db.saleItems.bulkPut(result.saleItems);
    count += result.saleItems.length;
  }

  if (result.lastSync) {
    localStorage.setItem('aide_last_sync', result.lastSync);
  } else {
    localStorage.setItem('aide_last_sync', new Date().toISOString());
  }

  return count;
}

async function countQuarantined(): Promise<number> {
  try {
    return await db.syncQueue.where('status').equals('quarantined').count();
  } catch {
    return 0;
  }
}

export function getSyncStatus(): {
  isOnline: boolean;
  isSyncing: boolean;
  pending: number;
} {
  return syncEngine.getStatus();
}
