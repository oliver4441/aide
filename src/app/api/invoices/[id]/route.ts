import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";

/**
 * AIDE-08: Invoice detail and payment operations.
 *
 * GET    /api/invoices/[id] — Get invoice details
 * PATCH  /api/invoices/[id] — Update invoice status or record payment
 * POST   /api/invoices/[id]/pay — Record payment against invoice
 */

export const dynamic = "force-dynamic";

/**
 * GET — Get invoice details with customer and line items.
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

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            balance: true,
          },
        },
        lines: true,
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

/**
 * PATCH — Update invoice status.
 *
 * Body: { status?: InvoiceStatus, notes?: string }
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.CUSTOMER_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body?.status !== undefined) {
      const status = body.status as InvoiceStatus;
      if (!Object.values(InvoiceStatus).includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = status;
    }

    if (body?.notes !== undefined) {
      updateData.notes = body.notes?.trim() || null;
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        lines: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * POST /api/invoices/[id]/pay — Record payment against an invoice.
 *
 * Body: { amount: number, paymentMethod?: PaymentMethod, reference?: string, notes?: string }
 * Updates invoice status and customer balance.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.CUSTOMER_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { customer: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (invoice.status === "PAID" || invoice.status === "CANCELLED" || invoice.status === "WRITTEN_OFF") {
      return NextResponse.json({ error: "Cannot pay this invoice" }, { status: 409 });
    }

    const body = await request.json();
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    const paymentMethod = (body?.paymentMethod as PaymentMethod) || PaymentMethod.CASH;
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    // Use transaction with fresh invoice read to prevent double-payment races
    const outcome = await prisma.$transaction(async (tx) => {
      const freshInvoice = await tx.invoice.findUnique({
        where: { id: params.id },
      });
      if (!freshInvoice) return { error: "Invoice not found", code: 404 as const };
      if (freshInvoice.businessId !== businessId) return { error: "Forbidden", code: 403 as const };
      if (
        freshInvoice.status === "PAID" ||
        freshInvoice.status === "CANCELLED" ||
        freshInvoice.status === "WRITTEN_OFF"
      ) {
        return { error: "Cannot pay this invoice", code: 409 as const };
      }

      const payment = await tx.paymentAllocation.create({
        data: {
          businessId,
          customerId: freshInvoice.customerId,
          invoiceId: params.id,
          amount,
          paymentMethod,
          reference: body?.reference?.trim() || null,
          notes: body?.notes?.trim() || null,
        },
      });

      const newAmountPaid = Number(freshInvoice.amountPaid) + amount;
      const newBalanceDue = Number(freshInvoice.total) - newAmountPaid;

      let newStatus: InvoiceStatus = freshInvoice.status;
      if (newBalanceDue <= 0) {
        newStatus = InvoiceStatus.PAID;
      } else if (newAmountPaid > 0) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: params.id },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: Math.max(0, newBalanceDue),
          status: newStatus,
        },
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true },
          },
          lines: true,
          payments: { orderBy: { paidAt: "desc" } },
        },
      });

      await tx.customer.update({
        where: { id: freshInvoice.customerId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      return { invoice: updatedInvoice, payment };
    });

    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.code });
    }

    return NextResponse.json(outcome);
  } catch (err) {
    return toAuthError(err);
  }
}
