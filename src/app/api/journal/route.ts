import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { gateRequest, approvalResponse } from "@/lib/approvalReplay";
import { postEntry } from "@/lib/accounting/post";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.JOURNAL_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const sourceType = searchParams.get("sourceType");
    const accountId = searchParams.get("accountId");

    const where: any = { businessId };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    if (sourceType) where.sourceType = sourceType;

    const entries = await prisma.journalEntry.findMany({
      where: accountId
        ? {
            ...where,
            lines: {
              some: { OR: [{ debitAccountId: accountId }, { creditAccountId: accountId }] },
            },
          }
        : where,
      include: {
        lines: accountId
          ? { where: { OR: [{ debitAccountId: accountId }, { creditAccountId: accountId }] } }
          : true,
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    return NextResponse.json(entries);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.JOURNAL_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const postings: Array<{ debitAccountCode?: string; creditAccountCode?: string; amount?: number }> =
      Array.isArray(body?.postings) ? body.postings : [];
    const journalAmount = postings.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);

    const approval = await gateRequest(request, body, {
      businessId,
      userId: user.id,
      actionType: "JOURNAL",
      resourceType: "JournalEntry",
      amount: journalAmount,
    });
    if (approval) return approvalResponse(approval);

    const result = await postEntry({
      businessId,
      description: body.description,
      sourceType: body.sourceType || "manual",
      sourceId: body.sourceId || null,
      postings: body.postings,
      date: body.date ? new Date(body.date) : undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
