import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { rollbackImport, requireImportRole } from "@/lib/importServer";

export const dynamic = "force-dynamic";

/**
 * POST /api/imports/[id]/rollback — undo a committed import batch.
 *
 * Deletes exactly the records this batch created (skipping — and reporting —
 * any that are now referenced by sales etc.) and restores the prior values of
 * rows that were merged into existing records. The batch is marked
 * ROLLED_BACK; it is never deleted, so the audit trail survives.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const batchId = String(params?.id ?? "").trim();
    if (!batchId) {
      return NextResponse.json({ error: "Batch id is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const businessIdHint =
      body && typeof body.businessId === "string" ? body.businessId : null;
    const { user, businessId, businessIds } = await requireBusiness(businessIdHint, request);
    if (businessIdHint && !businessIds.includes(businessIdHint)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const batch = await prisma.importBatch.findFirst({
      where: { id: batchId, businessId },
      select: { entity: true },
    });
    if (!batch) {
      return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
    }
    await requireImportRole(user, businessId, batch.entity.toLowerCase(), "delete");

    const result = await rollbackImport(businessId, batchId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  } catch (err) {
    return toAuthError(err);
  }
}
