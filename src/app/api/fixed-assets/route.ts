import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { parseAssetInput, bookValue } from "@/lib/accounting/depreciationCore.mjs";
import { recordAudit } from "@/lib/audit";

/**
 * AIDE-07 / ACC-11: fixed asset register.
 *
 * GET  /api/fixed-assets — list assets with accumulated depreciation and NBV
 * POST /api/fixed-assets — create an asset (OWNER or MANAGER)
 */

export const dynamic = "force-dynamic";

async function requireWriteRole(userId: string, businessId: string) {
  const membership = await prisma.businessMembership.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { role: true },
  });
  if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) return false;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const assets = await prisma.fixedAsset.findMany({
      where: { businessId },
      orderBy: { assetCode: "asc" },
      include: { depreciation: { select: { amount: true } } },
    });

    const rows = assets.map((asset) => {
      const accumulated = asset.depreciation.reduce(
        (sum, entry) => sum.add(entry.amount),
        new Prisma.Decimal(0)
      );
      return {
        ...asset,
        depreciation: undefined,
        accumulatedDepreciation: accumulated,
        bookValue: bookValue({
          cost: asset.cost.toString(),
          accumulated: accumulated.toString(),
        }),
      };
    });

    return NextResponse.json(rows);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    if (!(await requireWriteRole(user.id, businessId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    let input;
    try {
      input = parseAssetInput(body);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }

    const count = await prisma.fixedAsset.count({ where: { businessId } });
    const assetCode = `FA-${String(count + 1).padStart(4, "0")}`;

    const asset = await prisma.fixedAsset.create({
      data: { ...input, assetCode, businessId },
    });

    await recordAudit({
      action: "fixed_asset.create",
      entityType: "FixedAsset",
      entityId: asset.id,
      summary: `Added fixed asset ${asset.assetCode} (${asset.name})`,
      metadata: {
        assetCode: asset.assetCode,
        cost: asset.cost.toString(),
        usefulLifeMonths: asset.usefulLifeMonths,
      },
      actorId: user.id,
      businessId,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
