import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "user") {
    return null;
  }
  return session.user as { id: string; email?: string | null };
}

export async function GET() {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ business: null });
  }
  const membership = await prisma.businessMembership.findFirst({
    where: { userId: user.id },
    include: { business: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ business: membership?.business ?? null });
}

/**
 * Update the caller's own business profile. Settings → Business Profile saves
 * here so the change survives the next sync pull (the local-first write alone
 * used to be overwritten by the stale server copy on the next login).
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.businessMembership.findFirst({
      where: { userId: user.id },
      select: { businessId: true },
      orderBy: { createdAt: "asc" },
    });
    if (!membership) {
      return NextResponse.json({ error: "No business found" }, { status: 404 });
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
      where: { id: membership.businessId },
      data,
    });

    return NextResponse.json({ business });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const body = await request.json();
  const name = String(body?.name || "").trim();
  const type = String(body?.type || "OTHER").toUpperCase();
  if (!name) {
    return NextResponse.json({ error: "Business name required" }, { status: 400 });
  }

  const existing = await prisma.businessMembership.findFirst({
    where: { userId, role: "OWNER" },
  });
  if (existing) {
    return NextResponse.json({ error: "Business already exists" }, { status: 409 });
  }

  const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "business";
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const business = await prisma.business.create({
    data: {
      name,
      type: (["SALON", "SHOP", "RESTAURANT", "GROCERY", "PHARMACY", "ELECTRONICS", "CLOTHING", "OTHER"] as const).includes(type as any) ? (type as any) : "OTHER",
      slug,
      currency: "KSh",
      taxRate: 16,
      memberships: {
        create: { userId, role: "OWNER" },
      },
    },
  });

  return NextResponse.json({ business });
}
