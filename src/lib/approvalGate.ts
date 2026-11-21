import { prisma } from "./prisma";
import { selectPolicy, snapshotPolicy } from "./approvalEngine.mjs";
import { getEligibleApproverIds } from "./approvalAccess";
import { notifyApprovers } from "./approvalNotifications";

export type GateInput = {
  businessId: string;
  requesterId: string;
  actionType: "STOCK_ADJUSTMENT" | "PURCHASE_ORDER" | "SUPPLIER_PAYMENT" | "REFUND" | "JOURNAL" | "PRICE_CHANGE" | "DISCOUNT" | "EXPENSE" | "PERIOD_CLOSE";
  resourceType: string;
  resourceId?: string | null;
  amount?: number | null;
  payload?: unknown;
  /** Replay calls carry this flag so the gate does not recreate itself. */
  skip?: boolean;
};

/**
 * Server-side gate for sensitive actions. Returns the pending/created approval
 * request when a policy matches, or null when the caller may proceed directly.
 * Callers MUST return without performing the action when a request is returned.
 */
export async function gateAction(input: GateInput) {
  if (input.skip) return null;
  const policies = await prisma.approvalPolicy.findMany({
    where: { businessId: input.businessId, active: true },
  });
  const policy = selectPolicyForGate(policies, input.actionType, input.amount ?? 0);
  if (!policy) return null;

  const resourceId = input.resourceId ?? null;
  if (resourceId !== null) {
    const existing = await prisma.approvalRequest.findFirst({
      where: {
        businessId: input.businessId,
        status: "PENDING",
        resourceType: input.resourceType,
        resourceId,
      },
    });
    if (existing) return existing;
  }

  const created = await prisma.approvalRequest.create({
    data: {
      businessId: input.businessId,
      actionType: input.actionType,
      resourceType: input.resourceType,
      resourceId,
      amount: input.amount ?? null,
      payload: (input.payload ?? null) as never,
      requesterId: input.requesterId,
      status: "PENDING",
      ...snapshotPolicy(policy),
    },
  });
  const eligible = await getEligibleApproverIds(created);
  await notifyApprovers(created, eligible.filter((id) => id !== input.requesterId), "requested");
  return created;
}

function selectPolicyForGate(policies: any[], actionType: string, amount: number) {
  return selectPolicy(policies, actionType, amount);
}
