import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.PRODUCT_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");

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
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.PRODUCT_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const buyingPrice = Number(body.buyingPrice ?? 0);
    const sellingPrice = Number(body.sellingPrice);
    if (!Number.isFinite(buyingPrice) || buyingPrice < 0) {
      return NextResponse.json({ error: "Invalid buyingPrice" }, { status: 400 });
    }
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      return NextResponse.json({ error: "Invalid sellingPrice" }, { status: 400 });
    }

    const quantity = body.quantity !== undefined ? parseInt(String(body.quantity), 10) : 0;
    const lowStock = body.lowStock !== undefined ? parseInt(String(body.lowStock), 10) : 5;
    if (!Number.isInteger(quantity) || quantity < 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }
    if (!Number.isInteger(lowStock) || lowStock < 0) {
      return NextResponse.json({ error: "Invalid lowStock" }, { status: 400 });
    }

    if (body.categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: String(body.categoryId), businessId },
        select: { id: true },
      });
      if (!cat) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku: typeof body.sku === "string" && body.sku.trim() ? body.sku.trim() : null,
        buyingPrice,
        sellingPrice,
        quantity,
        lowStock,
        isService: Boolean(body.isService),
        categoryId: body.categoryId ? String(body.categoryId) : null,
        imageUrl: typeof body.imageUrl === "string" && body.imageUrl ? body.imageUrl : null,
        thumbnailUrl: typeof body.thumbnailUrl === "string" && body.thumbnailUrl ? body.thumbnailUrl : null,
        businessId,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
