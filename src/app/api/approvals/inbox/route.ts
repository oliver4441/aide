import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { getActiveDelegations, getEligibleApproverIds } from "@/lib/approvalAccess";
import { canActorDecide } from "@/lib/approvalEngine.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    const pending = await prisma.approvalRequest.findMany({
      where: { businessId, status: "PENDING" },
      include: { decisions: { select: { actorId: true, decision: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const delegations = await getActiveDelegations(businessId);
    const inbox = [];
    for (const item of pending) {
      const eligible = await getEligibleApproverIds(item);
      if (canActorDecide(item, user.id, eligible, delegations).allowed) {
        inbox.push(item);
      }
    }
    return NextResponse.json(inbox);
  } catch (err) {
    return toAuthError(err);
  }
}
