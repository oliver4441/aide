import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const businessId = await getDefaultBusinessId();

  const [todaySales, totalProducts, lowStockItems, recentSales] = await Promise.all([
    prisma.sale.aggregate({
      where: { businessId, createdAt: { gte: today } },
      _sum: { total: true, profit: true },
      _count: true,
    }),
    prisma.product.count({
      where: { businessId, isActive: true },
    }),
    prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
        isService: false,
        quantity: { lte: prisma.product.fields?.lowStock as any ?? 5 },
      },
      orderBy: { quantity: "asc" },
      take: 5,
    }),
    prisma.sale.findMany({
      where: { businessId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Calculate total stock value
  const stockValue = await prisma.product.aggregate({
    where: { businessId, isActive: true, isService: false },
    _sum: { sellingPrice: true },
  });

  // Yesterday comparison
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdaySales = await prisma.sale.aggregate({
    where: { businessId, createdAt: { gte: yesterday, lt: today } },
    _sum: { total: true },
  });

  const todayTotal = todaySales._sum.total ?? 0;
  const yesterdayTotal = yesterdaySales._sum.total ?? 0;
  const salesChange = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal * 100) : 0;

  return NextResponse.json({
    todaySales: todayTotal,
    todayProfit: todaySales._sum.profit ?? 0,
    salesCount: todaySales._count,
    totalProducts,
    lowStockItems,
    recentSales,
    salesChange: Math.round(salesChange),
  });
}

async function getDefaultBusinessId(): Promise<string> {
  const business = await prisma.business.findFirst({ orderBy: { createdAt: "asc" } });
  return business?.id ?? "";
}
