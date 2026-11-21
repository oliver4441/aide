import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-08: Customer detail operations.
 *
 * GET    /api/customers/[id] — Get customer details with balance
 * PATCH  /api/customers/[id] — Update customer info
 * DELETE /api/customers/[id] — Deactivate customer (soft delete)
 */

export const dynamic = "force-dynamic";

/**
 * GET — Get customer details including credit balance and recent activity.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.CUSTOMER_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        invoices: {
          where: { status: { notIn: ["PAID", "CANCELLED", "WRITTEN_OFF"] } },
          orderBy: { dueDate: "asc" },
          take: 10,
        },
        payments: {
          orderBy: { paidAt: "desc" },
          take: 10,
        },
        creditSales: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (customer.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(customer);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * PATCH — Update customer information.
 *
 * Body: { name?, email?, phone?, address?, city?, creditLimit?, notes?, isActive? }
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    // Check permission
    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.CUSTOMER_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (customer.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body?.name !== undefined) {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      updateData.name = name;
    }
    if (body?.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body?.phone !== undefined) updateData.phone = body.phone?.trim() || null;
    if (body?.address !== undefined) updateData.address = body.address?.trim() || null;
    if (body?.city !== undefined) updateData.city = body.city?.trim() || null;
    if (body?.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body?.creditLimit !== undefined) updateData.creditLimit = Number(body.creditLimit);
    if (body?.isActive !== undefined) updateData.isActive = body.isActive;

    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * DELETE — Deactivate customer (soft delete).
 * Cannot delete if customer has unpaid invoices.
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    // Check permission
    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.CUSTOMER_DELETE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (customer.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check for unpaid invoices
    const unpaidCount = await prisma.invoice.count({
      where: {
        customerId: params.id,
        status: { notIn: ["PAID", "CANCELLED", "WRITTEN_OFF"] },
      },
    });

    if (unpaidCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete customer with unpaid invoices" },
        { status: 409 }
      );
    }

    // Soft delete — deactivate customer
    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toAuthError(err);
  }
}
