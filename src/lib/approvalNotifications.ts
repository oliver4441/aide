import { prisma } from "./prisma";

type Notice = {
  id: string;
  businessId: string;
  actionType: string;
  createdAt: Date;
};

/** In-app notifications for approval inbox events. */
export async function notifyApprovers(
  request: Notice,
  userIds: string[],
  kind: "requested" | "escalated"
) {
  const recipients = Array.from(new Set(userIds));
  if (recipients.length === 0) return;
  await prisma.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      businessId: request.businessId,
      type: "system",
      title: kind === "requested" ? "Approval requested" : "Approval escalated",
      message: `${request.actionType.replaceAll("_", " ").toLowerCase()} requires your decision`,
      data: { requestId: request.id, kind },
    })),
  });
}

export async function notifyRequester(
  request: Notice & { requesterId: string },
  outcome: "APPROVED" | "REJECTED"
) {
  await prisma.notification.create({
    data: {
      userId: request.requesterId,
      businessId: request.businessId,
      type: "system",
      title: `Approval ${outcome.toLowerCase()}`,
      message: `${request.actionType.replaceAll("_", " ").toLowerCase()} was ${outcome.toLowerCase()}`,
      data: { requestId: request.id, outcome },
    },
  });
}
