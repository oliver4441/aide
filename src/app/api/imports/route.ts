import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

const MAX_LIST = 50;

/**
 * GET /api/imports — recent import batches for the caller's business.
 * Optional ?businessId= (must be a business the caller belongs to).
 */
export async function GET(request: NextRequest) {
  try {
    const businessIdParam = request.nextUrl.searchParams.get("businessId");
    const { user, businessId, businessIds } = await requireBusiness(businessIdParam, request);
    if (businessIdParam && !businessIds.includes(businessIdParam)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const batches = await prisma.importBatch.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: MAX_LIST,
    });

    const creatorIds = Array.from(
      new Set(batches.map((b: any) => b.createdById).filter((id: any) => Boolean(id)))
    ) as string[];
    const creators = creatorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const creatorById = new Map(creators.map((u: any) => [u.id, u]));

    return NextResponse.json(
      batches.map((b: any) => ({
        id: b.id,
        fileName: b.fileName,
        entity: b.entity,
        status: b.status,
        duplicateStrategy: b.duplicateStrategy,
        totalRows: b.totalRows,
        createdCount: b.createdCount,
        updatedCount: b.updatedCount,
        skippedCount: b.skippedCount,
        failedCount: b.failedCount,
        createdAt: b.createdAt,
        rolledBackAt: b.rolledBackAt,
        createdBy: b.createdById ? creatorById.get(b.createdById) ?? null : null,
        errorReport: Array.isArray(b.errorReport) ? (b.errorReport as unknown[]).slice(0, 100) : [],
      }))
    );
  } catch (err) {
    return toAuthError(err);
  }
}
