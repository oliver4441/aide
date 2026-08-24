import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getDefaultBusinessId(): Promise<string> {
  const business = await prisma.business.findFirst({ orderBy: { createdAt: "asc" } });
  return business?.id ?? "";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const businessId = await getDefaultBusinessId();

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.sale.count({ where: { businessId } }),
  ]);

  return NextResponse.json({ sales, total });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const businessId = await getDefaultBusinessId();

  // Create sale with items in a transaction
  const sale = await prisma.$transaction(async (tx) => {
    let total = 0;
    let cost = 0;

    const items = body.items.map((item: any) => {
      const itemTotal = item.price * item.quantity;
      const itemCost = item.cost * item.quantity;
      total += itemTotal;
      cost += itemCost;
      return {
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        cost: item.cost,
        productId: item.productId || null,
      };
    });

    const created = await tx.sale.create({
      data: {
        total,
        cost,
        profit: total - cost,
        paid: body.paid || total,
        change: (body.paid || total) - total,
        paymentMethod: body.paymentMethod || "CASH",
        notes: body.notes || null,
        businessId,
        items: { create: items },
      },
      include: { items: true },
    });

    // Deduct stock for non-service products
    for (const item of body.items) {
      if (item.productId && !item.isService) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    }

    return created;
  });

  return NextResponse.json(sale, { status: 201 });
}
