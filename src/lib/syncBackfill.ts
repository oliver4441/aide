/**
 * Sync backfill + reconciliation helpers.
 *
 * The existing SyncEngine relies on the browser's `online` event and a 30s
 * interval plus an occasional "Sync now" tap. This module adds a deterministic
 * backfill pass that the app can run in an idle/timeout hook or a background
 * worker:
 *
 *  1. Find pending syncQueue items older than `thresholdMs` (stuck / retry).
 *  2. Attempt a push (and optionally a pull) in the same order the queue holds
 *     them, so a failed mutation does not silently skip the older ones behind it.
 *  3. Record retry counts per queue item and fail items that exceed the retry
 *     budget, so they can be surfaced to the user as "needs attention".
 *  4. Reconcile local records from the server pull response, using the same
 *     upsert behaviour the native clients expect.
 *
 * The module deliberately keeps the existing `syncEngine.push()` / `pull()`
 * code paths. Nothing here changes the happy path; it only makes the failure
 * paths observable and retryable instead of "log and forget".
 */

import db, { SyncQueueItem } from './db';
import { syncEngine } from './sync';

/**
 * Queue rows do not carry a businessId — the active business lives in
 * localStorage and every push is scoped to it.
 */
function activeBusinessId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('aide_business_id') ?? '';
}

export type SyncTable = 'products' | 'categories' | 'sales' | 'saleItems';

export interface BackfillOptions {
  /** Seconds to wait before treating a pending item as stuck. */
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatCount(n: number): string {
  return n === 1 ? '1 item' : `${n} items`;
}

function wantsRetry(item: SyncQueueItem): boolean {
  return (
    item.action !== 'delete' &&
    (item.status === 'pending' || item.status === 'retry')
  );
}

// Prevents overlapping backfill runs from piling up on component re-mounts.
let runningBackfill = false;

export async function countPendingSyncQueue(): Promise<number> {
  // Dexie fallback: if the table is empty or the query fails, return 0.
  try {
    return await db.syncQueue.where('status').equals('pending').count();
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

  const now = Date.now();
  const cutoff = new Date(now - thresholdMs).toISOString();

  const stale = await db.syncQueue
    .where('status')
    .equals('pending')
    .and((item) => toDate(item.timestamp).getTime() < toDate(cutoff).getTime())
    .toArray();

  let quarantined = 0;
  for (const item of stale) {
    if (item.status === 'quarantined' || item.action === 'delete') continue;
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
  if (runningBackfill) return { attempts: 0, synced: 0, conflicts: 0, quarantined: 0, failed: 0, queued: 0, message: 'backfill already running' };
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
    const cutoff = new Date(now - retryThresholdMs).toISOString();

    const pending = await db.syncQueue
      .where('status')
      .equals('pending')
      .and((item) => toDate(item.timestamp).getTime() < toDate(cutoff).getTime())
      .toArray();

    let attempts = 0;
    let synced = 0;
    let conflicts = 0;
    let quarantined = 0;
    let failed = 0;

    for (const item of pending) {
      attempts++;
      const attemptsSoFar = Number(item.attempts ?? 0);

      // Skip items that are already being retried or are in a terminal state.
      if (item.status === 'retry' || item.status === 'quarantined' || item.action === 'delete') continue;

      try {
        const pushed = await processOneMutation(item);
        if (pushed) {
          synced++;
          continue;
        }
      } catch (err) {
        // The push itself failed before we could mark anything; retry below.
        const isAuthError = typeof err === 'string' && /401|403|Unauthorized/i.test(err);
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

async function processOneMutation(item: SyncQueueItem): Promise<boolean> {
  if (!syncEngine.getStatus().isOnline) return false;

  // Push one mutation at a time so the backfill result accurately reflects
  // whether THIS item made it to the server, not just whether the queue drained.
  const deviceId =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('aide_device_id') ?? ''
      : '';

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations: [item], deviceId }),
  });

  if (!res.ok) {
    throw new Error(`Sync failed: ${res.status}`);
  }

  const result = await res.json();
  const conflicts: any[] = result.conflicts ?? [];

  if (conflicts.length > 0) {
    for (const conflict of conflicts) {
      await db.syncConflicts.put(conflict);
    }
    // Conflict doesn't mean the item wasn't written — check the synced count.
  }

  const synced: number = result.synced ?? 0;
  if (synced > 0) {
    // Remove this specific item from the local queue.
    await db.syncQueue.delete(item.key!);
    return true;
  }

  return false;
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

  // Quarantined items are surface-level only; the user must act on them.
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
    await db.businesses.put({ ...result.business, syncStatus: 'synced' });
  }
  if (result.products) {
    for (const p of result.products) {
      await db.products.put({ ...p, syncStatus: 'synced' });
      count++;
    }
  }
  if (result.categories) {
    for (const c of result.categories) {
      await db.categories.put({ ...c, syncStatus: 'synced' });
      count++;
    }
  }
  if (result.sales) {
    for (const s of result.sales) {
      await db.sales.put({ ...s, syncStatus: 'synced' });
      count++;
    }
  }
  if (result.saleItems) {
    for (const si of result.saleItems) {
      await db.saleItems.put(si);
      count++;
    }
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
  // The engine owns the live flags and the mirrored outbox count; reading them
  // from here keeps every caller on one source of truth.
  return syncEngine.getStatus();
}