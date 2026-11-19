import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-08: Customer management API.
 *
 * GET    /api/customers — List customers for the business
 * POST   /api/customers — Create a new customer
 */

export const dynamic = "force-dynamic";

/**
 * GET — List all customers for the business.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");
    const query = searchParams.get("q");

    const where: any = { businessId };
    if (active === "true") where.isActive = true;
    else if (active === "false") where.isActive = false;
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { customerCode: { contains: query, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(customers);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * POST — Create a new customer.
 *
 * Body: { name, email?, phone?, address?, city?, creditLimit?, notes? }
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
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Count existing customers for sequential code
    const customerCount = await prisma.customer.count({ where: { businessId } });
    const customerCode = `CUST-${(customerCount + 1).toString().padStart(3, "0")}`;

    const customer = await prisma.customer.create({
      data: {
        businessId,
        customerCode,
        name,
        email: body?.email?.trim() || null,
        phone: body?.phone?.trim() || null,
        address: body?.address?.trim() || null,
        city: body?.city?.trim() || null,
        notes: body?.notes?.trim() || null,
        creditLimit: body?.creditLimit ? Number(body.creditLimit) : 0,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
