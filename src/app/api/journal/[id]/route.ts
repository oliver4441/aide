import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, toAuthError } from "@/lib/apiAuth";
import { reverseEntry, getAccountBalance } from "@/lib/accounting/post";

export const dynamic = "force-dynamic";

/**
 * GET /api/journal/[id]
 * Return a single journal entry with lines.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser(request);

    const entry = await prisma.journalEntry.findUnique({
      where: { id: params.id },
      include: {
        lines: { orderBy: { lineOrder: "asc" } },
        business: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check membership
    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId: entry.businessId } },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(entry);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * POST /api/journal/[id]/reverse
 * Reverse a posted journal entry.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser(request);

    const entry = await prisma.journalEntry.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check membership
    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId: entry.businessId } },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await reverseEntry(params.id);
    return NextResponse.json(result);
  } catch (err) {
    return toAuthError(err);
  }
}
