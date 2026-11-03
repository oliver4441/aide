import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getDefaultBusinessId(): Promise<string> {
  const business = await prisma.business.findFirst({ orderBy: { createdAt: "asc" } });
  return business?.id ?? "";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userBusinessId = (session?.user as any)?.businessId;
  const businessId = userBusinessId || (await getDefaultBusinessId());

  const categories = await prisma.category.findMany({
    where: { businessId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  // Security: Require active session authentication to create categories
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Category name required" }, { status: 400 });
  }

  // Security: Scope category creation to the authenticated user's business
  const userBusinessId = (session.user as any).businessId;
  const businessId = userBusinessId || (await getDefaultBusinessId());

  const category = await prisma.category.create({
    data: {
      name,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : parseInt(body.sortOrder, 10) || 0,
      businessId,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
