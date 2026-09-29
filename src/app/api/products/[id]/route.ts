import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser(request);

    // Membership-scoped: a product from another tenant is indistinguishable
    // from one that does not exist.
    const product = await prisma.product.findFirst({
      where: { id: params.id, business: { memberships: { some: { userId: user.id } } } },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser(request);

    // Membership check replaces the old role-based bypass, which let any
    // admin mutate any tenant's products.
    const existingProduct = await prisma.product.findFirst({
      where: { id: params.id, business: { memberships: { some: { userId: user.id } } } },
    });

    if (!existingProduct) {
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
  } catch (err) {
    return toAuthError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser(request);

    const existingProduct = await prisma.product.findFirst({
      where: { id: params.id, business: { memberships: { some: { userId: user.id } } } },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Soft delete
    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toAuthError(err);
  }
}
