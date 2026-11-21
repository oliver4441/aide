import { NextRequest, NextResponse } from "next/server";
import { gateAction } from "./approvalGate";

/**
 * Gate a write route and remember enough of the request to replay it after
 * approval. The replay goes back through the same handler, so all validation,
 * RBAC and tenant checks still apply.
 */
export async function gateRequest(
  request: NextRequest,
  body: unknown,
  input: {
    businessId: string;
    userId: string;
    actionType: Parameters<typeof gateAction>[0]["actionType"];
    resourceType: string;
    amount?: number | null;
    resourceId?: string | null;
    params?: Record<string, string>;
  }
) {
  return gateAction({
    businessId: input.businessId,
    requesterId: input.userId,
    actionType: input.actionType,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    amount: input.amount ?? null,
    payload: {
      __replay: {
        method: request.method,
        path: `${new URL(request.url).pathname}${new URL(request.url).search}`,
        body,
        params: input.params ?? {},
      },
    },
    skip: Boolean(request.headers.get("x-aide-replay")),
  });
}

export function approvalResponse(approval: { id: string; status: string }) {
  return NextResponse.json(
    { approvalRequired: true, requestId: approval.id, status: approval.status },
    { status: 202 }
  );
}
