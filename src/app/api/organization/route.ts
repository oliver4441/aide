import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError, resolveOrganization } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, organizationId } = await resolveOrganization(null, request);

    const membership = await prisma.businessMembership.findFirst({
      where: { userId: user.id },
      include: { business: { select: { organizationId: true } } },
    });

    if (!membership || membership.business.organizationId !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            currency: true,
            taxRate: true,
            status: true,
            createdAt: true,
          },
        },
        departments: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            parentId: true,
            createdAt: true,
          },
        },
        stockLocations: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            branchId: true,
            branch: { select: { id: true, name: true } },
            createdAt: true,
          },
        },
        terminals: {
          select: {
            id: true,
            code: true,
            name: true,
            branchId: true,
            branch: { select: { id: true, name: true } },
            locationId: true,
            location: { select: { id: true, name: true } },
            createdAt: true,
          },
        },
        cashDrawers: {
          select: {
            id: true,
            code: true,
            name: true,
            branchId: true,
            branch: { select: { id: true, name: true } },
            terminalId: true,
            terminal: { select: { id: true, name: true } },
            createdAt: true,
          },
        },
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json(org);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireBusiness(request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.user.id, businessId: user.businessId } },
      select: { role: true, business: { select: { organizationId: true } } },
    });

    if (!membership || !hasPermission(membership.role, Permission.SETTINGS_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const legalName = typeof body?.legalName === "string" ? body.legalName.trim() : name;
    const baseCurrency = typeof body?.baseCurrency === "string" ? body.baseCurrency.toUpperCase() : "KES";

    if (!name) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "org";
    let slug = `${slugBase}-${Date.now().toString(36)}`;
    for (let i = 0; i < 10 && (await prisma.organization.findUnique({ where: { slug }, select: { id: true } })); i++) {
      slug = `${slugBase}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        legalName,
        slug,
        baseCurrency,
        status: "ACTIVE",
      },
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, organizationId } = await resolveOrganization(null, request);

    const membership = await prisma.businessMembership.findFirst({
      where: { userId: user.id },
      include: { business: { select: { organizationId: true } } },
    });

    if (!membership || membership.business.organizationId !== organizationId || !hasPermission(membership.role, Permission.SETTINGS_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data: {
      name?: string;
      legalName?: string;
      baseCurrency?: string;
      status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Organization name required" }, { status: 400 });
      data.name = name;
    }
    if (body.legalName !== undefined) {
      data.legalName = String(body.legalName).trim() || null;
    }
    if (body.baseCurrency !== undefined) {
      const currency = String(body.baseCurrency).trim().toUpperCase();
      if (!currency) return NextResponse.json({ error: "Currency required" }, { status: 400 });
      data.baseCurrency = currency;
    }
    if (body.status !== undefined) {
      const status = String(body.status).toUpperCase();
      if (!["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = status as "ACTIVE" | "INACTIVE" | "SUSPENDED";
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data,
    });

    return NextResponse.json(organization);
  } catch (err) {
    return toAuthError(err);
  }
}