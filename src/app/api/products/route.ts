import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getDefaultBusinessId(): Promise<string> {
  const business = await prisma.business.findFirst({ orderBy: { createdAt: "asc" } });
  return business?.id ?? "";
}

export async function GET(request: NextRequest) {
  // Security: Require active session authentication to access product catalog
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");

  // Security: Scope product listing to the authenticated user's business (tenant isolation)
  const userBusinessId = (session.user as any).businessId;
  const userRole = (session.user as any).role;
  const isAdmin = userRole === "admin" || userRole === "SUPER_ADMIN";

  const businessId = isAdmin
    ? searchParams.get("businessId") || userBusinessId || (await getDefaultBusinessId())
    : userBusinessId || (await getDefaultBusinessId());

  if (!businessId) {
    return NextResponse.json([]);
  }

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
  // Require authentication before allowing product creation
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const businessId = (session.user as any).businessId || (await getDefaultBusinessId());

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
