export const OFFLINE_SYNC_STATUS = Object.freeze({
  QUEUED: "queued",
  SYNCING: "syncing",
  SYNCED: "synced",
  CONFLICT: "conflict",
  FAILED: "failed",
});

export function enqueueAccountingSync(queue, item) {
  if (!item?.idempotencyKey) {
    throw new Error("idempotencyKey is required");
  }
  const exists = queue.some((q) => q.idempotencyKey === item.idempotencyKey);
  if (exists) return queue;
  return [
    ...queue,
    {
      ...item,
      status: OFFLINE_SYNC_STATUS.QUEUED,
      queuedAt: new Date().toISOString(),
      lastError: null,
    },
  ];
}

export function markSyncResult(queue, idempotencyKey, status, lastError = null) {
  return queue.map((item) =>
    item.idempotencyKey === idempotencyKey
      ? {
          ...item,
          status,
          lastError,
          updatedAt: new Date().toISOString(),
        }
      : item
  );
}

export function summarizeSyncQueue(queue = []) {
  const summary = {
    total: queue.length,
    queued: 0,
    synced: 0,
    conflict: 0,
    failed: 0,
  };
  for (const item of queue) {
    if (item.status === OFFLINE_SYNC_STATUS.QUEUED) summary.queued += 1;
    else if (item.status === OFFLINE_SYNC_STATUS.SYNCED) summary.synced += 1;
    else if (item.status === OFFLINE_SYNC_STATUS.CONFLICT) summary.conflict += 1;
    else if (item.status === OFFLINE_SYNC_STATUS.FAILED) summary.failed += 1;
  }
  return summary;
}
