import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessBusiness, toAuthError } from "@/lib/apiAuth";
import { gateRequest, approvalResponse } from "@/lib/approvalReplay";
import { hasPermission, Permission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser(request);

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const hasAccess = await canAccessBusiness(user, product.businessId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId: product.businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.PRODUCT_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const hasAccess = await canAccessBusiness(user, existingProduct.businessId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId: existingProduct.businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.PRODUCT_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    if (body.sellingPrice !== undefined || body.buyingPrice !== undefined) {
      const nextSelling = body.sellingPrice !== undefined ? Number(body.sellingPrice) : Number(existingProduct.sellingPrice);
      const nextBuying = body.buyingPrice !== undefined ? Number(body.buyingPrice) : Number(existingProduct.buyingPrice);
      if (!Number.isFinite(nextSelling) || nextSelling < 0 || !Number.isFinite(nextBuying) || nextBuying < 0) {
        return NextResponse.json({ error: "Invalid price" }, { status: 400 });
      }
      const approval = await gateRequest(request, body, {
        businessId: existingProduct.businessId,
        userId: user.id,
        actionType: "PRICE_CHANGE",
        resourceType: "Product",
        resourceId: existingProduct.id,
        amount: Math.max(
          Math.abs(nextSelling - Number(existingProduct.sellingPrice)),
          Math.abs(nextBuying - Number(existingProduct.buyingPrice))
        ) || nextSelling,
        params: { id: existingProduct.id },
      });
      if (approval) return approvalResponse(approval);
    }

    const data: any = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Product name cannot be empty" }, { status: 400 });
      data.name = name;
    }
    if (body.sku !== undefined) data.sku = body.sku ? String(body.sku).trim() : null;
    if (body.buyingPrice !== undefined) data.buyingPrice = Number(body.buyingPrice);
    if (body.sellingPrice !== undefined) data.sellingPrice = Number(body.sellingPrice);
    if (body.quantity !== undefined) {
      const qty = parseInt(String(body.quantity), 10);
      if (!Number.isInteger(qty) || qty < 0) {
        return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
      }
      data.quantity = qty;
    }
    if (body.lowStock !== undefined) {
      const lowStock = parseInt(String(body.lowStock), 10);
      if (!Number.isInteger(lowStock) || lowStock < 0) {
        return NextResponse.json({ error: "Invalid lowStock" }, { status: 400 });
      }
      data.lowStock = lowStock;
    }
    if (body.isService !== undefined) data.isService = Boolean(body.isService);
    if (body.categoryId !== undefined) {
      if (body.categoryId) {
        const cat = await prisma.category.findFirst({
          where: { id: String(body.categoryId), businessId: existingProduct.businessId },
          select: { id: true },
        });
        if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });
        data.categoryId = cat.id;
      } else {
        data.categoryId = null;
      }
    }
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
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

    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const hasAccess = await canAccessBusiness(user, existingProduct.businessId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId: existingProduct.businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.PRODUCT_DELETE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toAuthError(err);
  }
}
