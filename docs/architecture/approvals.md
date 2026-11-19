# AIDE-12 — Approval workflows and separation of duties

First delivery slice. Status: **partial** — issue #51 stays open.

## What is implemented

- Versioned `ApprovalPolicy` records per business and action type, with amount
  thresholds, quorum (`minApprovals`), approver groups and a separation-of-duties
  flag. Creating a new version deactivates the previous one inside a transaction;
  old versions are never edited.
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
| Approval cannot be bypassed through direct API calls | Done for `STOCK_ADJUSTMENT` only |
| Concurrent approval attempts handled safely | Done (unique vote + transaction) |
| Policy changes do not rewrite historical records | Done |

## Remaining work on #51

- Gate purchase orders, bills/payments, expenses, discounts, price changes,
  refunds, journals and period close with `gateAction()` plus executors.
- Sequential approval chains and escalation job (`escalationHours` is stored but
  not yet scheduled).
- Approval notifications (inbox exists, delivery does not).
- Apply the migration to Neon after review; this slice ships schema + migration
  file but does not mutate the production database.

## Verification

`npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`,
`npm run build`, `npm run test:release` (51/51, including 7 new approval-engine
tests) all pass at the branch head.
