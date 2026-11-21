import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-09: Supplier detail operations.
 *
 * GET    /api/suppliers/[id] — Get supplier details
 * PATCH  /api/suppliers/[id] — Update supplier info
 * DELETE /api/suppliers/[id] — Deactivate supplier (soft delete)
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.SUPPLIER_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        purchaseOrders: {
          where: { status: { notIn: ["CANCELLED"] } },
          orderBy: { orderDate: "desc" },
          take: 10,
        },
        supplierInvoices: {
          where: { status: { notIn: ["PAID", "CANCELLED"] } },
          orderBy: { dueDate: "asc" },
          take: 10,
        },
        payments: {
          orderBy: { paidAt: "desc" },
          take: 10,
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }
    if (supplier.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(supplier);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.SUPPLIER_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }
    if (supplier.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body?.name !== undefined) {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      updateData.name = name;
    }
    if (body?.contactName !== undefined) updateData.contactName = body.contactName?.trim() || null;
    if (body?.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body?.phone !== undefined) updateData.phone = body.phone?.trim() || null;
    if (body?.address !== undefined) updateData.address = body.address?.trim() || null;
    if (body?.city !== undefined) updateData.city = body.city?.trim() || null;
    if (body?.taxId !== undefined) updateData.taxId = body.taxId?.trim() || null;
    if (body?.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body?.paymentTerms !== undefined) updateData.paymentTerms = Number(body.paymentTerms);
    if (body?.isActive !== undefined) updateData.isActive = body.isActive;

    const updated = await prisma.supplier.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.SUPPLIER_DELETE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }
    if (supplier.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const unpaidCount = await prisma.supplierInvoice.count({
      where: {
        supplierId: params.id,
        status: { notIn: ["PAID", "CANCELLED"] },
      },
    });
    if (unpaidCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete supplier with unpaid invoices" },
        { status: 409 }
      );
    }

    const updated = await prisma.supplier.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toAuthError(err);
  }
}
