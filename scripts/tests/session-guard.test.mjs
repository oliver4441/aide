import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sessionVersionMatches,
  nextTokenVersion,
  INITIAL_TOKEN_VERSION,
} from "../../src/lib/sessionGuard.mjs";

test("a current version passes; stale and malformed versions are rejected", () => {
  assert.equal(sessionVersionMatches(0, 0), true);
  assert.equal(sessionVersionMatches(3, 3), true);
  // Bumped account version invalidates an older credential immediately.
  assert.equal(sessionVersionMatches(0, 1), false);
  // Legacy credentials with no embedded version must re-authenticate.
  assert.equal(sessionVersionMatches(undefined, 0), false);
  assert.equal(sessionVersionMatches(null, 0), false);
  // Malformed values never pass.
  assert.equal(sessionVersionMatches(1.5, 1.5), false);
  assert.equal(sessionVersionMatches(-1, -1), false);
  assert.equal(sessionVersionMatches("2", 2), false);
});

test("token versions only ever increase and never wrap", () => {
  assert.equal(nextTokenVersion(0), 1);
  assert.equal(nextTokenVersion(41), 42);
  // Unknown/malformed current value is treated as 0 and bumped once.
  assert.equal(nextTokenVersion(null), 1);
  assert.equal(nextTokenVersion(undefined), 1);
  assert.equal(nextTokenVersion(-5), 1);
  assert.equal(nextTokenVersion(1.5), 1);
});

test("initial minted version is zero so fresh credentials are valid against a fresh account", () => {
  assert.equal(INITIAL_TOKEN_VERSION, 0);
  assert.equal(sessionVersionMatches(INITIAL_TOKEN_VERSION, 0), true);
});
