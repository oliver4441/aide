import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Security: Require active session authentication to modify products
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingProduct = await prisma.product.findUnique({
    where: { id: params.id },
  });

  if (!existingProduct) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Security: Prevent cross-tenant authorization bypass
  const userBusinessId = (session.user as any).businessId;
  const userRole = (session.user as any).role;
  if (userRole !== "admin" && existingProduct.businessId !== userBusinessId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.sku !== undefined) data.sku = body.sku;
  if (body.buyingPrice !== undefined) data.buyingPrice = parseFloat(body.buyingPrice);
  if (body.sellingPrice !== undefined) data.sellingPrice = parseFloat(body.sellingPrice);
  if (body.quantity !== undefined) data.quantity = parseInt(body.quantity);
  if (body.lowStock !== undefined) data.lowStock = parseInt(body.lowStock);
  if (body.isService !== undefined) data.isService = body.isService;
  if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
  if (body.thumbnailUrl !== undefined) data.thumbnailUrl = body.thumbnailUrl || null;

  const product = await prisma.product.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(product);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Security: Require active session authentication to soft-delete products
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingProduct = await prisma.product.findUnique({
    where: { id: params.id },
  });

  if (!existingProduct) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Security: Prevent cross-tenant authorization bypass
  const userBusinessId = (session.user as any).businessId;
  const userRole = (session.user as any).role;
  if (userRole !== "admin" && existingProduct.businessId !== userBusinessId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft delete
  await prisma.product.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
