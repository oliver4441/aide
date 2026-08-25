import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [totalBusinesses, totalUsers, totalSales, revenueAgg, totalProducts, reviewAgg, totalReviews] =
    await Promise.all([
      prisma.business.count(),
      prisma.user.count(),
      prisma.sale.count(),
      prisma.sale.aggregate({ _sum: { total: true } }),
      prisma.product.count(),
      prisma.review.aggregate({ _avg: { rating: true } }),
      prisma.review.count(),
    ]);

  const recentBusinessRows = await prisma.business.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { memberships: { where: { role: "OWNER" }, include: { user: true }, take: 1 } },
  });

  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json({
    totalBusinesses,
    totalUsers,
    totalSales,
    totalRevenue: revenueAgg._sum.total || 0,
    totalProducts,
    avgReviewRating: Math.round((reviewAgg._avg.rating || 0) * 10) / 10,
    totalReviews,
    recentBusinesses: recentBusinessRows.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      createdAt: b.createdAt,
      ownerName: b.memberships[0]?.user.name || "—",
    })),
    recentUsers,
  });
}
