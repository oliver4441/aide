import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-09: Supplier management API.
 *
 * GET    /api/suppliers — List suppliers for the business
 * POST   /api/suppliers — Create a new supplier
 */

export const dynamic = "force-dynamic";

/**
 * GET — List all suppliers for the business.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.SUPPLIER_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");
    const query = searchParams.get("q");

    const where: any = { businessId };
    if (active === "true") where.isActive = true;
    else if (active === "false") where.isActive = false;
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { contactName: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { supplierCode: { contains: query, mode: "insensitive" } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(suppliers);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * POST — Create a new supplier.
 *
 * Body: { name, contactName?, email?, phone?, address?, city?, taxId?, paymentTerms?, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.SUPPLIER_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supplier = await prisma.$transaction(async (tx) => {
      const latest = await tx.supplier.findFirst({
        where: { businessId, supplierCode: { startsWith: "SUP-" } },
        orderBy: { supplierCode: "desc" },
        select: { supplierCode: true },
      });
      const match = latest?.supplierCode.match(/SUP-(\d+)/);
      const seq = match ? parseInt(match[1], 10) + 1 : 1;
      const supplierCode = `SUP-${seq.toString().padStart(3, "0")}`;

      return tx.supplier.create({
        data: {
          businessId,
          supplierCode,
          name,
          contactName: body?.contactName?.trim() || null,
          email: body?.email?.trim() || null,
          phone: body?.phone?.trim() || null,
          address: body?.address?.trim() || null,
          city: body?.city?.trim() || null,
          taxId: body?.taxId?.trim() || null,
          notes: body?.notes?.trim() || null,
          paymentTerms: body?.paymentTerms ? Number(body.paymentTerms) : 30,
        },
      });
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
