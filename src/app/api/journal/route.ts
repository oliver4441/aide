import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { gateRequest, approvalResponse } from "@/lib/approvalReplay";
import { postEntry, getAccountBalance } from "@/lib/accounting/post";

export const dynamic = "force-dynamic";

/**
 * GET /api/journal
 * Return journal entries for the authenticated business.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

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

    let entries;
    if (accountId) {
      // Filter by account — get entries that touch this account
      entries = await prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            where: {
              OR: [{ debitAccountId: accountId }, { creditAccountId: accountId }],
            },
          },
        },
        orderBy: { date: "desc" },
        take: 100,
      });
    } else {
      entries = await prisma.journalEntry.findMany({
        where,
        include: { lines: true },
        orderBy: { date: "desc" },
        take: 100,
      });
    }

    return NextResponse.json(entries);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * POST /api/journal
 * Post a new journal entry via the posting engine.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const body = await request.json();

    const approval = await gateRequest(request, body, {
      businessId,
      userId: user.id,
      actionType: "JOURNAL",
      resourceType: "JournalEntry",
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
