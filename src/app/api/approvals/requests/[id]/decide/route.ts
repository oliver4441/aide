import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { getActiveDelegations, getEligibleApproverIds } from "@/lib/approvalAccess";
import { canActorDecide, evaluateRequest } from "@/lib/approvalEngine.mjs";
import { executeApproval } from "@/lib/approvalExecutors";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    const approval = await prisma.approvalRequest.findFirst({
      where: { id: params.id, businessId },
    });
    if (!approval) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (approval.status !== "PENDING") {
      return NextResponse.json({ error: "Request is already resolved" }, { status: 409 });
    }

    const body = await request.json();
    const decision = body?.decision;
    if (decision !== "APPROVE" && decision !== "REJECT") {
      return NextResponse.json({ error: "decision must be APPROVE or REJECT" }, { status: 400 });
    }

    const eligible = await getEligibleApproverIds(approval);
    const delegations = await getActiveDelegations(businessId);
    const permission = canActorDecide(approval, user.id, eligible, delegations);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        await tx.approvalDecision.create({
          data: {
            requestId: approval.id,
            actorId: user.id,
            decision,
            comments: body?.comments?.trim() || null,
            // Frozen from the request snapshot, never from the live policy.
            policyVersion: approval.policyVersion,
          },
        });
        const decisions = await tx.approvalDecision.findMany({ where: { requestId: approval.id } });
        const status = evaluateRequest(approval, decisions);
        if (status !== "PENDING") {
          await tx.approvalRequest.update({
            where: { id: approval.id },
            data: { status: status as never, resolvedAt: new Date() },
          });
        }
        return { status, decisions };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: "You have already decided on this request" }, { status: 409 });
      }
      throw err;
    }

    if (result.status === "APPROVED") {
      await executeApproval(approval.id);
    }
    return NextResponse.json(result);
  } catch (err) {
    return toAuthError(err);
  }
}
