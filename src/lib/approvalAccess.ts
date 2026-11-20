import { prisma } from "./prisma";

/** Approvers eligible for a request, from its frozen policy snapshot. */
export async function getEligibleApproverIds(request: {
  businessId: string;
  approverGroupId: string | null;
  activeGroupId?: string | null;
}): Promise<string[]> {
  const groupId = request.activeGroupId ?? request.approverGroupId;
  if (groupId) {
    const members = await prisma.approvalGroupMember.findMany({
      where: {
        groupId,
        group: { businessId: request.businessId },
      },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }
  const memberships = await prisma.businessMembership.findMany({
    where: {
      businessId: request.businessId,
      role: { in: ["OWNER", "MANAGER"] },
    },
    select: { userId: true },
  });
  return memberships.map((m) => m.userId);
}

export async function getActiveDelegations(businessId: string, now = new Date()) {
  return prisma.approvalDelegation.findMany({
    where: { businessId, active: true, expiresAt: { gt: now } },
    select: { fromUserId: true, toUserId: true, active: true, expiresAt: true },
  });
}
