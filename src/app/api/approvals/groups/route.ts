import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

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
    const groups = await prisma.approvalGroup.findMany({
      where: { businessId },
      include: { members: { select: { userId: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(groups);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    if (!(await requireManager(businessId, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    if (!body?.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const memberIds: string[] = Array.isArray(body?.memberIds) ? body.memberIds.filter(Boolean) : [];
    const group = await prisma.approvalGroup.create({
      data: {
        businessId,
        name: body.name.trim(),
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
      include: { members: { select: { userId: true } } },
    });
    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
