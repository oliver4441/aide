import { NextRequest, NextResponse } from "next/server";
import { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { gateRequest, approvalResponse } from "@/lib/approvalReplay";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-09: Supplier payment API — general payments not tied to a specific invoice.
 *
 * POST   /api/supplier-payments — Record a general payment to a supplier
 * GET    /api/supplier-payments — List payments
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.SUPPLIER_PAYMENT_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");

    const where: any = { businessId };
    if (supplierId) where.supplierId = supplierId;

    const payments = await prisma.supplierPayment.findMany({
      where,
      orderBy: { paidAt: "desc" },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true },
        },
      },
    });

    return NextResponse.json(payments);
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
    if (!membership || !hasPermission(membership.role, Permission.SUPPLIER_PAYMENT_CREATE)) {
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
      amount,
    });
    if (approval) return approvalResponse(approval);

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.supplierPayment.create({
        data: {
          businessId,
          supplierId,
          amount,
          paymentMethod,
          reference: body?.reference?.trim() || null,
          notes: body?.notes?.trim() || null,
        },
      });

      await tx.supplier.update({
        where: { id: supplierId },
        data: { balance: { decrement: amount } },
      });

      return created;
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
