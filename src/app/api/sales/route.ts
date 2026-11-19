import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { gateRequest, approvalResponse } from "@/lib/approvalReplay";
import { postSale, seedChartOfAccounts } from "@/lib/accounting/post";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

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
    const { user, businessId } = await requireBusiness(null, request);

    const body = await request.json();

    const approval = await gateRequest(request, body, {
      businessId,
      userId: user.id,
      actionType: "DISCOUNT",
      resourceType: "Sale",
      amount: Number(body.total) || 0,
    });
    if (approval) return approvalResponse(approval);

    // Calculate tax from business settings
    const taxRate = body.taxRate || 0;
    const taxMultiplier = taxRate / 100;

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

      // VAT-inclusive tax: tax = total - total/(1+rate/100)
      const tax = taxMultiplier > 0
        ? total - total / (1 + taxMultiplier)
        : 0;

      const created = await tx.sale.create({
        data: {
          total,
          cost,
          profit: total - cost,
          tax,
          taxRate: taxRate,
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

    // Auto-seed chart of accounts if this is the first sale
    const accountCount = await prisma.account.count({ where: { businessId } });
    if (accountCount === 0) {
      await seedChartOfAccounts(businessId);
    }

    // Auto-post sale to general ledger (non-blocking — don't fail the sale if posting fails)
    try {
      await postSale({
        businessId,
        saleId: sale.id,
        total: Number(sale.total),
        cost: Number(sale.cost),
        tax: Number(sale.tax),
        paymentMethod: sale.paymentMethod,
        date: sale.createdAt,
      });
    } catch (postingErr) {
      // Log but don't fail the sale — GL posting can be retried
      console.error(`[AIDE-06] Failed to post sale ${sale.id} to GL:`, postingErr);
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
