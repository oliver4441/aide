import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const businessId = (session?.user as any)?.businessId;
  if (!session?.user || !businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const businessId = (session?.user as any)?.businessId;
  if (!session?.user || !businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

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
}
