import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getDefaultBusinessId(): Promise<string> {
  const business = await prisma.business.findFirst({ orderBy: { createdAt: "asc" } });
  return business?.id ?? "";
}

export async function GET() {
  const businessId = await getDefaultBusinessId();
  const categories = await prisma.category.findMany({
    where: { businessId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const businessId = await getDefaultBusinessId();

  const category = await prisma.category.create({
    data: {
      name: body.name,
      sortOrder: body.sortOrder || 0,
      businessId,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
