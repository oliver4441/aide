import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { reverseEntry } from "@/lib/accounting/post";

export const dynamic = "force-dynamic";

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

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId: entry.businessId } },
      select: { role: true },
    });

    if (!membership || !hasPermission(membership.role, Permission.JOURNAL_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(entry);
  } catch (err) {
    return toAuthError(err);
  }
}

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

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId: entry.businessId } },
      select: { role: true },
    });

    if (!membership || !hasPermission(membership.role, Permission.JOURNAL_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await reverseEntry(params.id);
    return NextResponse.json(result);
  } catch (err) {
    return toAuthError(err);
  }
}
