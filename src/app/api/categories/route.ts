import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const categories = await prisma.category.findMany({
      where: { businessId },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(categories);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Category name required" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : parseInt(body.sortOrder, 10) || 0,
        businessId,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
