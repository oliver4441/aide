import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { bookValue } from "@/lib/accounting/depreciationCore.mjs";
import { recordAudit } from "@/lib/audit";

/**
 * AIDE-07 / ACC-11: fixed asset detail.
 *
 * GET    /api/fixed-assets/[id] — asset with depreciation history
 * PATCH  /api/fixed-assets/[id] — update descriptive fields or dispose
 * DELETE /api/fixed-assets/[id] — delete only if never depreciated (OWNER)
 */

export const dynamic = "force-dynamic";

async function membership(userId: string, businessId: string) {
  return prisma.businessMembership.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { role: true },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusiness(null, request);
    const { id } = await params;

    const asset = await prisma.fixedAsset.findFirst({
      where: { id, businessId },
      include: { depreciation: { orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }] } },
    });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const accumulated = asset.depreciation.reduce(
      (sum, entry) => sum.add(entry.amount),
      new Prisma.Decimal(0)
    );

    return NextResponse.json({
      ...asset,
      accumulatedDepreciation: accumulated,
      bookValue: bookValue({ cost: asset.cost.toString(), accumulated: accumulated.toString() }),
    });
  } catch (err) {
    return toAuthError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    const role = await membership(user.id, businessId);
    if (!role || !["OWNER", "MANAGER"].includes(role.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.fixedAsset.findFirst({ where: { id, businessId } });
    if (!existing) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const body = await request.json();
    const data: Prisma.FixedAssetUpdateInput = {};

    if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body?.category === "string") data.category = body.category.trim() || null;
    if (typeof body?.description === "string") data.description = body.description.trim() || null;

    if (body?.status !== undefined) {
      if (!["ACTIVE", "DISPOSED"].includes(body.status)) {
        return NextResponse.json({ error: "status must be ACTIVE or DISPOSED" }, { status: 400 });
      }
      data.status = body.status;
      if (body.status === "DISPOSED") {
        data.disposedAt = body?.disposedAt ? new Date(body.disposedAt) : new Date();
        if (body?.disposalProceeds !== undefined) {
          data.disposalProceeds = new Prisma.Decimal(body.disposalProceeds);
        }
      } else {
        data.disposedAt = null;
        data.disposalProceeds = null;
      }
    }

    const updated = await prisma.fixedAsset.update({ where: { id }, data });

    if (body?.status !== undefined) {
      await recordAudit({
        action: body.status === "DISPOSED" ? "fixed_asset.dispose" : "fixed_asset.reactivate",
        entityType: "FixedAsset",
        entityId: updated.id,
        summary:
          body.status === "DISPOSED"
            ? `Disposed fixed asset ${updated.assetCode}`
            : `Reactivated fixed asset ${updated.assetCode}`,
        metadata: { status: body.status, disposalProceeds: body?.disposalProceeds ?? null },
        actorId: user.id,
        businessId,
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    const role = await membership(user.id, businessId);
    if (!role || role.role !== "OWNER") {
      return NextResponse.json({ error: "Only owner can delete assets" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.fixedAsset.findFirst({
      where: { id, businessId },
      include: { _count: { select: { depreciation: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    if (existing._count.depreciation > 0) {
      return NextResponse.json(
        { error: "Cannot delete an asset with depreciation history; dispose it instead" },
        { status: 409 }
      );
    }

    await prisma.fixedAsset.delete({ where: { id } });
    await recordAudit({
      action: "fixed_asset.delete",
      entityType: "FixedAsset",
      entityId: id,
      summary: `Deleted fixed asset ${existing.assetCode}`,
      actorId: user.id,
      businessId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return toAuthError(err);
  }
}
