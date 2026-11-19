import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { SupplierInvoiceStatus } from "@prisma/client";

/**
 * AIDE-09: Supplier invoice detail operations.
 *
 * GET    /api/supplier-invoices/[id] — Get invoice details
 * PATCH  /api/supplier-invoices/[id] — Update status or notes
 * POST   /api/supplier-invoices/[id]/pay — Record payment
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const invoice = await prisma.supplierInvoice.findUnique({
      where: { id: params.id },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, email: true, address: true },
        },
        purchaseOrder: {
          select: { id: true, poNumber: true, status: true },
          include: { lines: true },
        },
        payments: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(invoice);
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
    if (!membership || !hasPermission(membership.role, Permission.SUPPLIER_INVOICE_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoice = await prisma.supplierInvoice.findUnique({ where: { id: params.id } });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body?.status !== undefined) {
      const validStatuses = Object.values(SupplierInvoiceStatus);
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = body.status;
    }
    if (body?.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body?.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate);

    const updated = await prisma.supplierInvoice.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * POST /api/supplier-invoices/[id]/pay — Record payment against invoice.
 *
 * Body: { amount, paymentMethod?, reference?, notes? }
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.SUPPLIER_PAYMENT_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoice = await prisma.supplierInvoice.findUnique({ where: { id: params.id } });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot pay this invoice" }, { status: 400 });
    }

    const body = await request.json();
    const amount = Number(body?.amount) || 0;
    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    const payment = await prisma.supplierPayment.create({
      data: {
        businessId,
        supplierId: invoice.supplierId,
        invoiceId: params.id,
        amount,
        paymentMethod: body?.paymentMethod || "CASH",
        reference: body?.reference?.trim() || null,
        notes: body?.notes?.trim() || null,
      },
    });

    // Update invoice payment status
    const newAmountPaid = Number(invoice.amountPaid) + amount;
    const newBalanceDue = Number(invoice.total) - newAmountPaid;

    let newStatus: SupplierInvoiceStatus;
    if (newBalanceDue <= 0) {
      newStatus = "PAID";
    } else {
      newStatus = "PARTIALLY_PAID";
    }

    await prisma.supplierInvoice.update({
      where: { id: params.id },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: Math.max(0, newBalanceDue),
        status: newStatus,
      },
    });

    // Update supplier balance
    await prisma.supplier.update({
      where: { id: invoice.supplierId },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
