import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFLINE_SYNC_STATUS,
  enqueueAccountingSync,
  markSyncResult,
  summarizeSyncQueue,
} from '../../src/lib/accountingOfflineSync.mjs';

test('enqueueAccountingSync deduplicates by idempotencyKey', () => {
  let queue = [];
  queue = enqueueAccountingSync(queue, { idempotencyKey: 'k-1', type: 'sale.posted' });
  queue = enqueueAccountingSync(queue, { idempotencyKey: 'k-1', type: 'sale.posted' });
  assert.equal(queue.length, 1);
  assert.equal(queue[0].status, OFFLINE_SYNC_STATUS.QUEUED);
});

test('markSyncResult and summarizeSyncQueue track offline sync states', () => {
  let queue = [];
  queue = enqueueAccountingSync(queue, { idempotencyKey: 'k-1', type: 'sale.posted' });
  queue = enqueueAccountingSync(queue, { idempotencyKey: 'k-2', type: 'refund.posted' });
  queue = markSyncResult(queue, 'k-1', OFFLINE_SYNC_STATUS.SYNCED);
  queue = markSyncResult(queue, 'k-2', OFFLINE_SYNC_STATUS.FAILED, 'Network timeout');

  const summary = summarizeSyncQueue(queue);
  assert.equal(summary.total, 2);
  assert.equal(summary.synced, 1);
  assert.equal(summary.failed, 1);
});
