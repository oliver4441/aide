import { NextRequest, NextResponse } from "next/server";
import { ApprovalActionType, ApprovalStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { selectPolicy, snapshotPolicy } from "@/lib/approvalEngine.mjs";
import { getEligibleApproverIds } from "@/lib/approvalAccess";
import { notifyApprovers } from "@/lib/approvalNotifications";

export const dynamic = "force-dynamic";

const ACTIONS = Object.values(ApprovalActionType);

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const actionType = searchParams.get("actionType");
    const where: Prisma.ApprovalRequestWhereInput = { businessId };
    if (status && Object.values(ApprovalStatus).includes(status as ApprovalStatus)) {
      where.status = status as ApprovalStatus;
    }
    if (actionType && ACTIONS.includes(actionType as ApprovalActionType)) {
      where.actionType = actionType as ApprovalActionType;
    }
    const requests = await prisma.approvalRequest.findMany({
      where,
      include: { decisions: { orderBy: { decidedAt: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(requests);
  } catch (err) {
    return toAuthError(err);
  }
}

/** Create an approval request when a matching policy exists. */
export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    const body = await request.json();
    const actionType = body?.actionType;
    if (!ACTIONS.includes(actionType)) {
      return NextResponse.json({ error: "Invalid actionType" }, { status: 400 });
    }
    const resourceType = String(body?.resourceType || actionType);
    const resourceId = body?.resourceId ? String(body.resourceId) : null;
    const amount = body?.amount === null || body?.amount === undefined || body?.amount === ""
      ? null
      : Number(body.amount);

    const policies = await prisma.approvalPolicy.findMany({ where: { businessId, active: true } });
    const policy = selectPolicy(policies, actionType, amount);
    if (!policy) {
      return NextResponse.json({ approvalRequired: false }, { status: 200 });
    }

    const existing = await prisma.approvalRequest.findFirst({
      where: { businessId, status: "PENDING", resourceType, resourceId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A pending approval already exists for this resource", requestId: existing.id },
        { status: 409 }
      );
    }

    const snapshot = snapshotPolicy(policy);
    const approval = await prisma.approvalRequest.create({
      data: {
        businessId,
        actionType,
        resourceType,
        resourceId,
        amount,
        payload: body?.payload ?? Prisma.JsonNull,
        requesterId: user.id,
        status: "PENDING",
        ...snapshot,
      },
    });
    const eligible = await getEligibleApproverIds(approval);
    await notifyApprovers(approval, eligible.filter((id) => id !== user.id), "requested");
    return NextResponse.json({ approvalRequired: true, request: approval }, { status: 202 });
  } catch (err) {
    return toAuthError(err);
  }
}
