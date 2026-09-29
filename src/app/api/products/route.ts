import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const { businessId } = await requireBusiness(null, request);

    const where: any = { businessId, isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(products);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        sku: body.sku,
        buyingPrice: parseFloat(body.buyingPrice),
        sellingPrice: parseFloat(body.sellingPrice),
        quantity: parseInt(body.quantity) || 0,
        lowStock: parseInt(body.lowStock) || 5,
        isService: body.isService || false,
        categoryId: body.categoryId || null,
        imageUrl: body.imageUrl || null,
        thumbnailUrl: body.thumbnailUrl || null,
        businessId,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
