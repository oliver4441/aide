import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { PaymentMethod } from "@prisma/client";

/**
 * AIDE-08: General customer payment API.
 *
 * POST /api/customers/[id]/pay — Record payment against customer balance
 * (not tied to a specific invoice)
 */

export const dynamic = "force-dynamic";

/**
 * POST — Record a payment against a customer's general balance.
 *
 * Body: { amount: number, paymentMethod?: PaymentMethod, reference?: string, notes?: string }
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
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    const paymentMethod = (body?.paymentMethod as PaymentMethod) || PaymentMethod.CASH;
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    // Record payment and update customer balance atomically
    const result = await prisma.$transaction(async (tx) => {
      const freshCustomer = await tx.customer.findUnique({ where: { id: params.id } });
      if (!freshCustomer || freshCustomer.businessId !== businessId) {
        throw new Error("Customer not found");
      }

      const payment = await tx.paymentAllocation.create({
        data: {
          businessId,
          customerId: params.id,
          amount,
          paymentMethod,
          reference: body?.reference?.trim() || null,
          notes: body?.notes?.trim() || null,
        },
      });

      const updatedCustomer = await tx.customer.update({
        where: { id: params.id },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      return { payment, customer: updatedCustomer };
    });

    return NextResponse.json(result);
  } catch (err) {
    return toAuthError(err);
  }
}
