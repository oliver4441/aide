import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { SupplierInvoiceStatus } from "@prisma/client";

/**
 * AIDE-09: Supplier invoice management API.
 *
 * GET    /api/supplier-invoices — List supplier invoices
 * POST   /api/supplier-invoices — Create a new supplier invoice
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const overdue = searchParams.get("overdue");

    const where: any = { businessId };
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (overdue === "true") {
      where.status = { notIn: ["PAID", "CANCELLED"] };
      where.dueDate = { lt: new Date() };
    }

    const invoices = await prisma.supplierInvoice.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, email: true },
        },
        purchaseOrder: {
          select: { id: true, poNumber: true },
        },
        payments: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    return NextResponse.json(invoices);
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
    if (!membership || !hasPermission(membership.role, Permission.SUPPLIER_INVOICE_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const supplierId = body?.supplierId;
    if (!supplierId) {
      return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier || supplier.businessId !== businessId) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const invoiceNumber = body?.invoiceNumber?.trim();
    if (!invoiceNumber) {
      return NextResponse.json({ error: "invoiceNumber is required" }, { status: 400 });
    }

    const subtotal = Number(body?.subtotal) || 0;
    const tax = Number(body?.tax) || 0;
    const total = Number(body?.total) || (subtotal + tax);
    const dueDate = body?.dueDate ? new Date(body.dueDate) : new Date(Date.now() + supplier.paymentTerms * 86400000);

    const invoice = await prisma.supplierInvoice.create({
      data: {
        businessId,
        invoiceNumber,
        supplierId,
        purchaseOrderId: body?.purchaseOrderId || null,
        ourRef: body?.ourRef?.trim() || null,
        issueDate: body?.issueDate ? new Date(body.issueDate) : new Date(),
        dueDate,
        subtotal,
        tax,
        total,
        balanceDue: total,
        notes: body?.notes?.trim() || null,
      },
    });

    // Update supplier balance
    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        balance: {
          increment: total,
        },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
