# AIDE-12 — Approval workflows and separation of duties

First delivery slice. Status: **partial** — issue #51 stays open.

## What is implemented

- Versioned `ApprovalPolicy` records per business and action type, with amount
  thresholds, quorum (`minApprovals`), approver groups, escalation groups and a
  separation-of-duties flag. Creating a new version deactivates the previous
  one inside a transaction; old versions are never edited.
- Server-side gates plus HTTP replay executors cover eight action types:
  `STOCK_ADJUSTMENT`, `PURCHASE_ORDER`, `SUPPLIER_PAYMENT`, `REFUND`, `JOURNAL`,
  `PRICE_CHANGE`, `DISCOUNT` and `PERIOD_CLOSE`. An approved request replays the
  original route with a signed, short-lived internal token so the route's own
  validation, RBAC and tenant checks still run. `executedAt` makes replay
  one-shot.
- Time-boxed escalation: `escalationHours` and `escalationGroupId` are snapshotted
  onto each request; `POST /api/approvals/escalate` (cron secret) moves overdue
  requests to the escalation group without editing the frozen policy snapshot.
- `ApprovalRequest` snapshots the policy id, version, name, quorum, separation
  flag and approver group at creation time. Later policy changes cannot rewrite
  historical requests.
- `ApprovalDecision` records actor, timestamp, comments and the frozen policy
  version. `@@unique([requestId, actorId])` prevents one actor voting twice;
  concurrent decisions are handled in a transaction and a duplicate vote
  returns HTTP 409.
- Server-side gate `src/lib/approvalGate.ts`. `POST /api/stock-adjustments`
  calls it before any write and returns HTTP 202 with the request id instead of
  creating the adjustment. Once the quorum is reached,
  `src/lib/approvalExecutors.ts` creates the adjustment exactly once
  (`executedAt` claim) and applies the stock changes.
- APIs: `/api/approvals/policies`, `/api/approvals/groups`,
  `/api/approvals/requests`, `/api/approvals/inbox`,
  `/api/approvals/requests/[id]/decide`. All use `requireBusiness()` for tenant
  isolation; policy and group writes require OWNER or MANAGER.
- Delegations are time-boxed (`expiresAt`, `active`) and can grant voting rights
  to another user without letting the requester approve their own action.

## Acceptance-criteria status

| Criterion | Status |
|---|---|
| Decisions record actor, timestamp, comments, policy version | Done |
| Approval cannot be bypassed through direct API calls | Done for all eight gated write routes |
| Concurrent approval attempts handled safely | Done (unique vote + transaction) |
| Policy changes do not rewrite historical records | Done |

## Remaining work on #51

- `EXPENSE` has no web write route (Android is local-only), so it stays declarative.
- Configure a cron caller for `POST /api/approvals/escalate` with
  `APPROVAL_CRON_SECRET`.
- Apply the migration to Neon after review; this slice ships schema + migration
  file but does not mutate the production database.

## Verification

`npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`,
`npm run build`, `npm run test:release` (51/51, including 7 new approval-engine
tests) all pass at the branch head.
