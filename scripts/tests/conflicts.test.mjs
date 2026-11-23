import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveConflict, checkStockOversell } from '../../src/lib/conflicts.ts';

test('resolveConflict prefers newer product updatedAt timestamp', () => {
  const clientNewer = resolveConflict({
    entityType: 'product',
    entityId: 'p1',
    clientData: { updatedAt: '2026-01-02T00:00:00Z', deviceId: 'a' },
    serverData: { updatedAt: '2026-01-01T00:00:00Z', deviceId: 'b' },
  });
  assert.equal(clientNewer.resolution, 'client-wins');

  const serverNewer = resolveConflict({
    entityType: 'product',
    entityId: 'p1',
    clientData: { updatedAt: '2026-01-01T00:00:00Z', deviceId: 'b' },
    serverData: { updatedAt: '2026-01-02T00:00:00Z', deviceId: 'a' },
  });
  assert.equal(serverNewer.resolution, 'server-wins');
});

test('resolveConflict breaks equal-timestamp ties safely even with missing deviceId', () => {
  const res = resolveConflict({
    entityType: 'product',
    entityId: 'p1',
    clientData: { updatedAt: '2026-01-01T00:00:00Z' },
    serverData: { updatedAt: '2026-01-01T00:00:00Z', deviceId: 'dev-1' },
  });
  assert.equal(res.resolution, 'server-wins');

  const invalidDates = resolveConflict({
    entityType: 'product',
    entityId: 'p1',
    clientData: { updatedAt: 'not-a-date', deviceId: 'z' },
    serverData: { updatedAt: 'also-invalid', deviceId: 'a' },
  });
  assert.equal(invalidDates.resolution, 'client-wins');
});

test('checkStockOversell detects negative stock in chronological order', () => {
  const ok = checkStockOversell('p1', 10, [
    { delta: -4, timestamp: '2026-01-01T01:00:00Z' },
    { delta: 5, timestamp: '2026-01-01T02:00:00Z' },
  ]);
  assert.equal(ok.ok, true);
  assert.equal(ok.finalQuantity, 11);

  const oversell = checkStockOversell('p1', 3, [
    { delta: -5, timestamp: '2026-01-01T01:00:00Z' },
    { delta: 10, timestamp: '2026-01-01T02:00:00Z' },
  ]);
  assert.equal(oversell.ok, false);
  assert.equal(oversell.finalQuantity, -2);
});
