import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const businessId = (session?.user as any)?.businessId;
  if (!session?.user || !businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const product = await prisma.product.findFirst({
    where: { id: params.id, businessId },
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
  const session = await getServerSession(authOptions);
  const businessId = (session?.user as any)?.businessId;
  if (!session?.user || !businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.product.findFirst({
    where: { id: params.id, businessId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
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
  const session = await getServerSession(authOptions);
  const businessId = (session?.user as any)?.businessId;
  if (!session?.user || !businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.product.findFirst({
    where: { id: params.id, businessId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Soft delete
  await prisma.product.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
