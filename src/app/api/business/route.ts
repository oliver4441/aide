import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireBusiness, getAccessibleBusinessIds, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const businessIds = await getAccessibleBusinessIds(user);
    if (businessIds.length === 0) {
      return NextResponse.json({ business: null });
    }

    const membership = await prisma.businessMembership.findFirst({
      where: { userId: user.id, businessId: { in: businessIds } },
      include: { business: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ business: membership?.business ?? null });
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * Update the caller's own business profile. Settings → Business Profile saves
 * here so the change survives the next sync pull (the local-first write alone
 * used to be overwritten by the stale server copy on the next login).
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.SETTINGS_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data: {
      name?: string;
      type?: "SALON" | "SHOP" | "RESTAURANT" | "GROCERY" | "PHARMACY" | "ELECTRONICS" | "CLOTHING" | "OTHER";
      currency?: string;
      taxRate?: number;
      receiptFooter?: string | null;
    } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "Business name required" }, { status: 400 });
      }
      data.name = name;
    }
    if (body.type !== undefined) {
      const type = String(body.type).toUpperCase();
      const allowedTypes = [
        "SALON",
        "SHOP",
        "RESTAURANT",
        "GROCERY",
        "PHARMACY",
        "ELECTRONICS",
        "CLOTHING",
        "OTHER",
      ] as const;
      data.type = allowedTypes.includes(type as never) ? (type as typeof allowedTypes[number]) : "OTHER";
    }
    if (body.currency !== undefined) {
      const currency = String(body.currency).trim();
      data.currency = currency || "KSh";
    }
    if (body.taxRate !== undefined) {
      const taxRate = Number(body.taxRate);
      if (!isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        return NextResponse.json({ error: "Invalid tax rate" }, { status: 400 });
      }
      data.taxRate = taxRate;
    }
    if (body.receiptFooter !== undefined) {
      const footer = String(body.receiptFooter ?? "").trim();
      data.receiptFooter = footer || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const business = await prisma.business.update({
      where: { id: businessId },
      data,
    });

    return NextResponse.json({ business });
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);

    // Defensive: sessions created before the Google auto-provisioning fix can
    // carry a user id that was never committed to the User table. Ensure the
    // user exists before creating a membership that references it.
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    if (!dbUser) {
      // Try to recover by email; if that also fails, create the user.
      let recovered = user.email
        ? await prisma.user.findUnique({ where: { email: user.email }, select: { id: true } })
        : null;
      if (!recovered && user.email) {
        recovered = await prisma.user.create({
          data: { email: user.email, name: user.name || "User", passwordHash: "" },
          select: { id: true },
        });
      }
      if (recovered) {
        // Rebind the in-memory id so the membership uses the real DB id.
        user.id = recovered.id;
      } else {
        return NextResponse.json({ error: "Could not resolve user account" }, { status: 400 });
      }
    }

    const body = await request.json();
    const name = String(body?.name || "").trim();
    const type = String(body?.type || "OTHER").toUpperCase();
    if (!name) {
      return NextResponse.json({ error: "Business name required" }, { status: 400 });
    }

    const existing = await prisma.businessMembership.findFirst({
      where: { userId: user.id, role: "OWNER" },
    });
    if (existing) {
      return NextResponse.json({ error: "Business already exists" }, { status: 409 });
    }

    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "business";
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    // A new business also gets its own Organization (the company) so it is
    // tenant-scoped from creation. AIDE-02 / AIDE-03 extend this with
    // multi-org membership and RBAC.
    const orgSlugBase = slugBase === "business" ? "org" : slugBase;
    let orgSlug = `${orgSlugBase}-${Date.now().toString(36)}`;
    for (let i = 0; i < 10 && (await prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } })); i++) {
      orgSlug = `${orgSlugBase}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const organization = await prisma.organization.create({
      data: {
        name,
        legalName: name,
        slug: orgSlug,
        baseCurrency: "KES",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    const business = await prisma.business.create({
      data: {
        name,
        type: (["SALON", "SHOP", "RESTAURANT", "GROCERY", "PHARMACY", "ELECTRONICS", "CLOTHING", "OTHER"] as const).includes(type as any) ? (type as any) : "OTHER",
        slug,
        currency: "KSh",
        taxRate: 16,
        organizationId: organization.id,
        memberships: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    });

    return NextResponse.json({ business });
  } catch (err) {
    return toAuthError(err);
  }
}
