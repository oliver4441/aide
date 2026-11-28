import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateApiKey, hashApiKey, parseApiKey, hashesEqual,
  normalizeScopes, hasScope, SCOPES,
} from '../../src/lib/apiKeyCore.mjs';

test('generated key has prefix, stored hash never equals plaintext', () => {
  const { key, prefix, hash } = generateApiKey();
  assert.ok(key.startsWith(`aide_${prefix}_`));
  assert.equal(hash, hashApiKey(key));
  assert.notEqual(hash, key);
  assert.equal(hash.length, 64);
});

test('parseApiKey extracts prefix and matching hash, rejects garbage', () => {
  const { key, prefix, hash } = generateApiKey();
  const parsed = parseApiKey(key);
  assert.equal(parsed.prefix, prefix);
  assert.equal(parsed.hash, hash);
  assert.equal(parseApiKey('nope'), null);
  assert.equal(parseApiKey(''), null);
  assert.equal(parseApiKey(null), null);
});

test('hashesEqual is constant-time-safe and rejects mismatches', () => {
  const a = hashApiKey('one'), b = hashApiKey('two');
  assert.equal(hashesEqual(a, hashApiKey('one')), true);
  assert.equal(hashesEqual(a, b), false);
  assert.equal(hashesEqual(a, 'deadbeef'), false);
  assert.equal(hashesEqual(null, a), false);
});

test('scope normalization dedupes, rejects unknown scopes', () => {
  assert.deepEqual(normalizeScopes(['sales:read', 'sales:read', 'products:write']), ['sales:read', 'products:write']);
  assert.equal(normalizeScopes(['sales:read', 'admin:all']), null);
  assert.equal(normalizeScopes('sales:read'), null);
  assert.ok(SCOPES.includes('webhooks:write'));
});

test('hasScope enforces exact scope match', () => {
  assert.equal(hasScope(['sales:read'], 'sales:read'), true);
  assert.equal(hasScope(['sales:read'], 'sales:write'), false);
  assert.equal(hasScope(null, 'sales:read'), false);
});

// ── ENT-09: signed webhooks ────────────────────────────────────────────────
import {
  signPayload, signatureHeader, parseSignatureHeader, verifySignature,
  safeEqualHex, generateNonce, normalizeEvents, WEBHOOK_EVENTS, TOLERANCE_SECONDS,
} from '../../src/lib/webhookCore.mjs';

test('signature header round-trips and verifies', () => {
  const secret = 'whsec_test', body = '{"type":"sale.created"}';
  const t = '1700000000';
  const header = signatureHeader(secret, t, body);
  assert.equal(parseSignatureHeader(header).timestamp, t);
  const v = verifySignature(secret, body, header, Number(t));
  assert.equal(v.ok, true);
  assert.equal(v.timestamp, Number(t));
});

test('signature verification rejects tampered body and bad secret', () => {
  const secret = 'whsec_test', t = '1700000000';
  const header = signatureHeader(secret, t, 'original');
  assert.equal(verifySignature(secret, 'tampered', header, Number(t)).ok, false);
  assert.equal(verifySignature('wrong', 'original', header, Number(t)).ok, false);
});

test('signature verification rejects stale timestamps', () => {
  const secret = 'whsec_test', body = '{}', t = 1700000000;
  const header = signatureHeader(secret, String(t), body);
  const stale = verifySignature(secret, body, header, t + TOLERANCE_SECONDS + 1);
  assert.equal(stale.ok, false);
  assert.match(stale.error, /Timestamp/);
});

test('signature verification rejects malformed headers', () => {
  assert.equal(verifySignature('s', '{}', '', 1).ok, false);
  assert.equal(verifySignature('s', '{}', 't=abc,v1=xyz', 1).ok, false);
  assert.equal(parseSignatureHeader('t=1'), null);
  assert.equal(safeEqualHex('aa', 'bb'), false);
});

test('nonces are random and event list is validated', () => {
  assert.notEqual(generateNonce(), generateNonce());
  assert.deepEqual(normalizeEvents(['sale.created', 'sale.created', 'product.created']), ['sale.created', 'product.created']);
  assert.equal(normalizeEvents(['sale.created', 'bogus.event']), null);
  assert.ok(WEBHOOK_EVENTS.includes('import.completed'));
});
