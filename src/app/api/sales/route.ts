import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const { businessId } = await requireBusiness(null, request);

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
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);
    const body = await request.json();

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "items array required" }, { status: 400 });
    }

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

      // Deduct stock for non-service products, scoped to this business so a
      // sale cannot decrement another tenant's inventory by id reference.
      for (const item of body.items) {
        if (item.productId && !item.isService) {
          await tx.product.updateMany({
            where: { id: item.productId, businessId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      return created;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
