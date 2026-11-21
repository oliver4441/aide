import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { ApprovalActionType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ACTIONS = Object.values(ApprovalActionType);

async function requireManager(businessId: string, userId: string) {
  const membership = await prisma.businessMembership.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { role: true },
  });
  return membership?.role === "OWNER" || membership?.role === "MANAGER";
}

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);
    const policies = await prisma.approvalPolicy.findMany({
      where: { businessId },
      orderBy: [{ actionType: "asc" }, { version: "desc" }],
    });
    return NextResponse.json(policies);
  } catch (err) {
    return toAuthError(err);
  }
}

/** Create a new policy version; previous versions stay untouched for history. */
export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    if (!(await requireManager(businessId, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const actionType = body?.actionType;
    if (!ACTIONS.includes(actionType)) {
      return NextResponse.json({ error: "Invalid actionType" }, { status: 400 });
    }
    const minApprovals = Number(body?.minApprovals);
    if (!Number.isInteger(minApprovals) || minApprovals < 1) {
      return NextResponse.json({ error: "minApprovals must be a positive integer" }, { status: 400 });
    }
    if (!body?.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const threshold =
      body.threshold === null || body.threshold === undefined || body.threshold === ""
        ? null
        : Number(body.threshold);
    if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0)) {
      return NextResponse.json({ error: "threshold must be a non-negative number" }, { status: 400 });
    }

    const policy = await prisma.$transaction(async (tx) => {
      const latest = await tx.approvalPolicy.findFirst({
        where: { businessId, actionType },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      await tx.approvalPolicy.updateMany({
        where: { businessId, actionType, threshold, active: true },
        data: { active: false },
      });
      return tx.approvalPolicy.create({
        data: {
          businessId,
          name: body.name.trim(),
          actionType,
          threshold,
          minApprovals,
          requireSeparation: body.requireSeparation !== false,
          escalationHours: body.escalationHours ? Number(body.escalationHours) : null,
          approverGroupId: body.approverGroupId || null,
          escalationGroupId: body.escalationGroupId || null,
          version: (latest?.version ?? 0) + 1,
          active: true,
        },
      });
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
