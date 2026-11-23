import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OUTBOX_STATUS,
  validateAccountingContract,
  createOutboxEvent,
  recordOutboxFailure,
  replayDeadLetterEvent,
  redactSensitivePayload,
} from '../../src/lib/accountingOutbox.mjs';

test('validateAccountingContract enforces decimal strings and ISO currency', () => {
  const valid = validateAccountingContract({
    orgId: 'org-1',
    currency: 'KES',
    amount: '1500.50',
  });
  assert.equal(valid.ok, true);

  const floatAmount = validateAccountingContract({
    orgId: 'org-1',
    currency: 'KES',
    amount: 1500.5,
  });
  assert.equal(floatAmount.ok, false);
});

test('createOutboxEvent generates deterministic idempotencyKey', () => {
  const a = createOutboxEvent({
    orgId: 'org-1',
    type: 'sale.posted',
    sourceEntity: 'sale',
    sourceId: 'sale-123',
    payload: { amount: '100.00' },
  });
  const b = createOutboxEvent({
    orgId: 'org-1',
    type: 'sale.posted',
    sourceEntity: 'sale',
    sourceId: 'sale-123',
    payload: { amount: '100.00' },
  });
  assert.equal(a.idempotencyKey, b.idempotencyKey);
  assert.equal(a.status, OUTBOX_STATUS.PENDING);
});

test('recordOutboxFailure transitions to dead_letter and replayDeadLetterEvent resets it', () => {
  let ev = createOutboxEvent({
    orgId: 'org-1',
    type: 'invoice.issued',
    sourceEntity: 'invoice',
    sourceId: 'inv-1',
    payload: {},
  });

  ev = recordOutboxFailure(ev, 'timeout', 2);
  assert.equal(ev.status, OUTBOX_STATUS.PENDING);
  ev = recordOutboxFailure(ev, 'timeout', 2);
  assert.equal(ev.status, OUTBOX_STATUS.DEAD_LETTER);

  const replayed = replayDeadLetterEvent(ev);
  assert.equal(replayed.status, OUTBOX_STATUS.PENDING);
  assert.equal(replayed.retries, 0);
  assert.equal(replayed.lastError, null);
});

test('redactSensitivePayload redacts secrets recursively', () => {
  const redacted = redactSensitivePayload({
    orgId: 'org-1',
    token: 'secret-jwt',
    nested: { apiKey: 'key-123', amount: '50.00' },
  });
  assert.equal(redacted.token, '[REDACTED]');
  assert.equal(redacted.nested.apiKey, '[REDACTED]');
  assert.equal(redacted.nested.amount, '50.00');
});
