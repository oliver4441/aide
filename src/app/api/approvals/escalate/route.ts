import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEligibleApproverIds } from "@/lib/approvalAccess";
import { notifyApprovers } from "@/lib/approvalNotifications";

export const dynamic = "force-dynamic";

function isAuthorizedCron(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Cron-triggered escalation. Strictly requires APPROVAL_CRON_SECRET.
 * Moves overdue requests to their escalation group without touching the
 * frozen policy snapshot.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.APPROVAL_CRON_SECRET;
  if (!isAuthorizedCron(request.headers.get("x-approval-cron"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await prisma.approvalRequest.findMany({
    where: { status: "PENDING", escalationGroupId: { not: null }, activeGroupId: null },
    take: 200,
  });
  const now = new Date();
  let escalated = 0;

  for (const item of pending) {
    if (!item.escalationHours) continue;
    const cutoff = new Date(item.createdAt.getTime() + item.escalationHours * 3_600_000);
    if (cutoff > now) continue;

    const updated = await prisma.approvalRequest.updateMany({
      where: { id: item.id, activeGroupId: null, status: "PENDING" },
      data: { activeGroupId: item.escalationGroupId, escalatedAt: now },
    });
    if (updated.count === 0) continue;
    escalated += 1;
    const eligible = await getEligibleApproverIds({ ...item, activeGroupId: item.escalationGroupId });
    await notifyApprovers(item, eligible.filter((id) => id !== item.requesterId), "escalated");
  }

  return NextResponse.json({ escalated });
}
