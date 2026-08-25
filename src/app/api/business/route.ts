import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "user") {
    return NextResponse.json({ business: null });
  }
  const userId = (session.user as any).id as string;
  const membership = await prisma.businessMembership.findFirst({
    where: { userId },
    include: { business: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ business: membership?.business ?? null });
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
