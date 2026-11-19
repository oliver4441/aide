import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  selectPolicy,
  isDelegationActive,
  canActorDecide,
  countApprovals,
  evaluateRequest,
  snapshotPolicy,
} from "../../src/lib/approvalEngine.mjs";

const basePolicy = {
  id: "p1",
  name: "Large stock adjustments",
  actionType: "STOCK_ADJUSTMENT",
  threshold: 1000,
  minApprovals: 2,
  requireSeparation: true,
  active: true,
  version: 3,
};

test("policy selection prefers the highest matching threshold", () => {
  const policies = [
    { ...basePolicy, id: "all", threshold: null, version: 1 },
    basePolicy,
    { ...basePolicy, id: "huge", threshold: 100000, minApprovals: 3 },
  ];
  assert.equal(selectPolicy(policies, "STOCK_ADJUSTMENT", 500).id, "all");
  assert.equal(selectPolicy(policies, "STOCK_ADJUSTMENT", 1500).id, "p1");
  assert.equal(selectPolicy(policies, "STOCK_ADJUSTMENT", 150000).id, "huge");
  assert.equal(selectPolicy(policies, "REFUND", 150000), null);
  assert.equal(selectPolicy(policies.map((p) => ({ ...p, active: false })), "STOCK_ADJUSTMENT", 1500), null);
});

test("separation of duties blocks the requester from approving", () => {
  const request = { requesterId: "u1", requireSeparation: true, minApprovals: 1 };
  assert.equal(canActorDecide(request, "u1", ["u1", "u2"], []).allowed, false);
  assert.equal(canActorDecide(request, "u2", ["u1", "u2"], []).allowed, true);
  assert.equal(canActorDecide({ ...request, requireSeparation: false }, "u1", ["u1"], []).allowed, true);
});

test("delegation with expiry grants and loses voting rights", () => {
  const request = { requesterId: "u1", requireSeparation: true, minApprovals: 1 };
  const now = new Date("2026-11-20T10:00:00Z");
  const delegation = { fromUserId: "u2", toUserId: "u3", active: true, expiresAt: "2026-11-20T12:00:00Z" };
  assert.equal(canActorDecide(request, "u3", ["u2"], [delegation], now).allowed, true);
  assert.equal(canActorDecide(request, "u3", ["u2"], [{ ...delegation, active: false }], now).allowed, false);
  assert.equal(
    canActorDecide(request, "u3", ["u2"], [{ ...delegation, expiresAt: "2026-11-20T09:00:00Z" }], now).allowed,
    false
  );
  assert.equal(isDelegationActive(delegation, new Date("2026-11-20T11:00:00Z")), true);
});

test("duplicate votes from the same actor count once", () => {
  const decisions = [
    { actorId: "a", decision: "APPROVE" },
    { actorId: "a", decision: "APPROVE" },
    { actorId: "b", decision: "APPROVE" },
  ];
  assert.equal(countApprovals(decisions), 2);
});

test("quorum approval and any rejection resolve the request", () => {
  const request = { minApprovals: 2 };
  const approvals = [
    { actorId: "a", decision: "APPROVE" },
    { actorId: "b", decision: "APPROVE" },
  ];
  assert.equal(evaluateRequest(request, approvals.slice(0, 1)), "PENDING");
  assert.equal(evaluateRequest(request, approvals), "APPROVED");
  assert.equal(evaluateRequest(request, [...approvals, { actorId: "c", decision: "REJECT" }]), "REJECTED");
});

test("policy snapshot is detached from later policy edits", () => {
  const policy = { ...basePolicy };
  const snapshot = snapshotPolicy(policy);
  policy.name = "Renamed";
  policy.version = 99;
  policy.minApprovals = 5;
  assert.equal(snapshot.policyName, "Large stock adjustments");
  assert.equal(snapshot.policyVersion, 3);
  assert.equal(snapshot.minApprovals, 2);
});

test("schema enforces one decision per actor and records audit fields", () => {
  const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");
  assert.match(schema, /@@unique\(\[requestId, actorId\]\)/);
  assert.match(schema, /model ApprovalDecision[\s\S]*policyVersion\s+Int/);
  assert.match(schema, /model ApprovalDecision[\s\S]*decidedAt\s+DateTime/);
  assert.match(schema, /model ApprovalDecision[\s\S]*comments\s+String\?/);
  assert.match(schema, /model ApprovalRequest[\s\S]*policyVersion\s+Int/);
});
