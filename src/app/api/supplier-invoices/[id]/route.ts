import { NextRequest, NextResponse } from "next/server";
import { PaymentMethod, SupplierInvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { gateRequest, approvalResponse } from "@/lib/approvalReplay";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-09: Supplier invoice detail operations.
 *
 * GET    /api/supplier-invoices/[id] — Get invoice details
 * PATCH  /api/supplier-invoices/[id] — Update status or notes
 * POST   /api/supplier-invoices/[id] — Record payment
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.SUPPLIER_INVOICE_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    const body = await request.json();
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    const paymentMethod = (body?.paymentMethod as PaymentMethod) || PaymentMethod.CASH;
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid paymentMethod" }, { status: 400 });
    }

    const approval = await gateRequest(request, body, {
      businessId,
      userId: user.id,
      actionType: "SUPPLIER_PAYMENT",
      resourceType: "SupplierPayment",
      resourceId: params.id,
      amount,
      params: { id: params.id },
    });
    if (approval) return approvalResponse(approval);

    const outcome = await prisma.$transaction(async (tx) => {
      const invoice = await tx.supplierInvoice.findUnique({ where: { id: params.id } });
      if (!invoice) return { error: "Invoice not found", code: 404 as const };
      if (invoice.businessId !== businessId) return { error: "Forbidden", code: 403 as const };
      if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
        return { error: "Cannot pay this invoice", code: 409 as const };
      }

      const newAmountPaid = Number(invoice.amountPaid) + amount;
      const newBalanceDue = Math.max(0, Number(invoice.total) - newAmountPaid);
      const newStatus: SupplierInvoiceStatus =
        newBalanceDue <= 0 ? "PAID" : "PARTIALLY_PAID";

      const payment = await tx.supplierPayment.create({
        data: {
          businessId,
          supplierId: invoice.supplierId,
          invoiceId: params.id,
          amount,
          paymentMethod,
          reference: body?.reference?.trim() || null,
          notes: body?.notes?.trim() || null,
        },
      });

      await tx.supplierInvoice.update({
        where: { id: params.id },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
      });

      await tx.supplier.update({
        where: { id: invoice.supplierId },
        data: { balance: { decrement: amount } },
      });

      return { payment };
    });

    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.code });
    }

    return NextResponse.json(outcome.payment, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
