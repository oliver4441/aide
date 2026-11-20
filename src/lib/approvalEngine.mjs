// AIDE-12: pure approval policy logic.
// Kept free of Prisma/Next imports so the invariants can be unit tested.

/** Pick the most specific active policy for an action and amount. */
export function selectPolicy(policies, actionType, amount) {
  const value = amount === null || amount === undefined ? 0 : Number(amount);
  const matches = policies.filter((policy) => {
    if (!policy.active || policy.actionType !== actionType) return false;
    if (policy.threshold === null || policy.threshold === undefined) return true;
    return value >= Number(policy.threshold);
  });
  matches.sort((a, b) => {
    const left = a.threshold === null || a.threshold === undefined ? -1 : Number(a.threshold);
    const right = b.threshold === null || b.threshold === undefined ? -1 : Number(b.threshold);
    return right - left || b.version - a.version;
  });
  return matches[0] ?? null;
}

/** True when a delegation is currently usable. */
export function isDelegationActive(delegation, now = new Date()) {
  if (!delegation || delegation.active === false) return false;
  return new Date(delegation.expiresAt).getTime() > now.getTime();
}

/**
 * Decide whether an actor may vote on a request.
 * groupMemberIds are the eligible approvers for this request's policy.
 * Delegations are { fromUserId, toUserId, active, expiresAt } records.
 */
export function canActorDecide(request, actorId, groupMemberIds, delegations = [], now = new Date()) {
  if (!actorId) return { allowed: false, reason: "No actor" };

  const delegatedFrom = (fromUserId) =>
    delegations.some(
      (d) =>
        d.fromUserId === fromUserId &&
        d.toUserId === actorId &&
        isDelegationActive(d, now)
    );

  if (request.requireSeparation && actorId === request.requesterId) {
    // Self-approval is only possible through an explicit delegation from the
    // requester to a *different* account; the actor id can never equal the
    // requester id, so this is always denied.
    return { allowed: false, reason: "Separation of duties: requester cannot approve" };
  }

  if (groupMemberIds.includes(actorId)) {
    return { allowed: true, reason: "Group member" };
  }
  if (groupMemberIds.some((memberId) => delegatedFrom(memberId))) {
    return { allowed: true, reason: "Active delegation" };
  }
  return { allowed: false, reason: "Not an approver" };
}

/** Distinct APPROVE votes; one vote per actor is enforced by a unique DB index. */
export function countApprovals(decisions) {
  return new Set(decisions.filter((d) => d.decision === "APPROVE").map((d) => d.actorId)).size;
}

/** Resolve request status from the recorded decisions and policy snapshot. */
export function evaluateRequest(request, decisions) {
  if (decisions.some((d) => d.decision === "REJECT")) return "REJECTED";
  if (countApprovals(decisions) >= request.minApprovals) return "APPROVED";
  return "PENDING";
}

/** Pure snapshot used when creating a request: policy edits cannot rewrite it. */
export function snapshotPolicy(policy) {
  return {
    policyId: policy.id,
    policyVersion: policy.version,
    policyName: policy.name,
    minApprovals: policy.minApprovals,
    requireSeparation: policy.requireSeparation,
    approverGroupId: policy.approverGroupId ?? null,
    escalationGroupId: policy.escalationGroupId ?? null,
    escalationHours: policy.escalationHours ?? null,
  };
}
