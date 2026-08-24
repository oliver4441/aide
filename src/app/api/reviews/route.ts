import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getDefaultBusinessId(): Promise<string> {
  const business = await prisma.business.findFirst({ orderBy: { createdAt: "asc" } });
  return business?.id ?? "";
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const businessId = await getDefaultBusinessId();

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? null;

  const review = await prisma.review.create({
    data: {
      rating: body.rating,
      categories: body.categories,
      comment: body.comment || null,
      contactEmail: body.contactEmail || null,
      businessId,
      userId,
    },
  });

  return NextResponse.json(review, { status: 201 });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rating = searchParams.get("rating");

  const where: any = {};
  if (rating) where.rating = parseInt(rating, 10);

  const [reviews, total, avg] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
  ]);

  return NextResponse.json({
    reviews,
    total,
    averageRating: avg._avg.rating ?? 0,
  });
}
