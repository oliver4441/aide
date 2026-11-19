import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { InvoiceStatus } from "@prisma/client";

/**
 * AIDE-08: Invoice management API.
 *
 * GET    /api/invoices — List invoices for the business
 * POST   /api/invoices — Create a new invoice
 */

export const dynamic = "force-dynamic";

/**
 * GET — List invoices for the business with optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const overdue = searchParams.get("overdue");

    const where: any = { businessId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (overdue === "true") {
      where.status = { notIn: ["PAID", "CANCELLED", "WRITTEN_OFF"] };
      where.dueDate = { lt: new Date() };
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true, balance: true },
        },
        lines: true,
      },
    });

    return NextResponse.json(invoices);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * POST — Create a new invoice.
 *
 * Body: {
 *   customerId: string,
 *   lines: [{ description, quantity, unitPrice }],
 *   dueDate?: string (ISO date, defaults to 30 days from now),
 *   notes?: string,
 *   taxRate?: number (defaults to business tax rate)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    // Check permission
    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.CUSTOMER_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const customerId = body?.customerId;
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    // Verify customer belongs to business
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    if (customer.businessId !== businessId) {
      return NextResponse.json({ error: "Customer not found" }, { status: 403 });
    }

    const lines = body?.lines;
    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }

    // Get business tax rate
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { taxRate: true },
    });
    const taxRate = body?.taxRate !== undefined ? Number(body.taxRate) : Number(business?.taxRate || 0);

    // Calculate totals
    let subtotal = 0;
    const lineData = lines.map((line: any, index: number) => {
      const quantity = Number(line?.quantity || 1);
      const unitPrice = Number(line?.unitPrice || 0);
      const amount = quantity * unitPrice;
      subtotal += amount;
      return {
        description: line?.description || "",
        quantity,
        unitPrice,
        amount,
      };
    });

    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    // Generate invoice number
    const year = new Date().getFullYear();
    const invoiceCount = await prisma.invoice.count({
      where: { businessId, issueDate: { gte: new Date(year, 0, 1) } },
    });
    const invoiceNumber = `INV-${year}-${(invoiceCount + 1).toString().padStart(4, "0")}`;

    const dueDate = body?.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await prisma.invoice.create({
      data: {
        businessId,
        customerId,
        invoiceNumber,
        dueDate,
        subtotal,
        tax,
        total,
        balanceDue: total,
        notes: body?.notes?.trim() || null,
        status: InvoiceStatus.ISSUED,
        lines: {
          create: lineData,
        },
      },
      include: {
        lines: true,
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
