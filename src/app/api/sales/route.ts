import { NextRequest, NextResponse } from "next/server";
import { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { postSale, seedChartOfAccounts } from "@/lib/accounting/post";
import { recordSaleMovements } from "@/lib/inventoryLedger";
import { resolveRbacContext, assertPermission } from "@/lib/rbacGuard";
import { resolveEmployeeScope, ACCESS_SCOPE } from "@/lib/rbacScope.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveRbacContext(null, request);
    assertPermission(ctx, Permission.SALE_READ);
    const { user, businessId } = ctx;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);

    // AIDE-03: own-records templates never see anyone else's sales. The
    // filter is applied server-side; a client cannot widen it by asking.
    const scope = resolveEmployeeScope(ctx.employee);
    const where = {
      businessId,
      ...(scope === ACCESS_SCOPE.OWN_RECORDS
        ? { cashierUserId: user.id }
        : {}),
    };

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({ sales, total });
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.SALE_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const rawItems = body?.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: "Sale must include at least one item" }, { status: 400 });
    }

    const paymentMethod = (body.paymentMethod || "CASH") as PaymentMethod;
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid paymentMethod" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { taxRate: true },
    });
    const taxRate =
      body.taxRate !== undefined && Number.isFinite(Number(body.taxRate)) && Number(body.taxRate) >= 0
        ? Number(body.taxRate)
        : Number(business?.taxRate || 0);
    const taxMultiplier = taxRate / 100;

    // Look up catalog products scoped strictly to this business so client payloads
    // cannot tamper with catalog prices or decrement another tenant's stock.
    const productIds = Array.from(
      new Set(
        rawItems
          .map((item: any) => item?.productId)
          .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
      )
    );
    const catalogProducts = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds }, businessId },
          select: { id: true, name: true, sellingPrice: true, buyingPrice: true, isService: true },
        })
      : [];
    const productMap = new Map(catalogProducts.map((p) => [p.id, p]));

    for (const pid of productIds) {
      if (!productMap.has(pid)) {
        return NextResponse.json({ error: `Product ${pid} not found in this business` }, { status: 404 });
      }
    }

    let total = 0;
    let cost = 0;
    const normalizedItems: Array<{
      name: string;
      quantity: number;
      price: number;
      cost: number;
      productId: string | null;
      isService: boolean;
    }> = [];

    for (const raw of rawItems) {
      const quantity = parseInt(String(raw?.quantity), 10);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json({ error: "Item quantity must be a positive integer" }, { status: 400 });
      }
      const catalog = raw?.productId ? productMap.get(String(raw.productId)) : undefined;
      const price = catalog ? Number(catalog.sellingPrice) : Number(raw?.price);
      const itemCost = catalog ? Number(catalog.buyingPrice) : Number(raw?.cost ?? 0);
      const name = catalog ? catalog.name : String(raw?.name || "").trim();

      if (!name || !Number.isFinite(price) || price < 0 || !Number.isFinite(itemCost) || itemCost < 0) {
        return NextResponse.json({ error: "Invalid sale item data" }, { status: 400 });
      }

      total += price * quantity;
      cost += itemCost * quantity;
      normalizedItems.push({
        name,
        quantity,
        price,
        cost: itemCost,
        productId: catalog ? catalog.id : null,
        isService: catalog ? catalog.isService : Boolean(raw?.isService),
      });
    }

    const paid = body.paid !== undefined ? Number(body.paid) : total;
    if (!Number.isFinite(paid) || paid < total) {
      return NextResponse.json({ error: "Paid amount must cover sale total" }, { status: 400 });
    }

    const tax = taxMultiplier > 0 ? total - total / (1 + taxMultiplier) : 0;

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          total,
          cost,
          profit: total - cost,
          tax,
          taxRate,
          paid,
          change: paid - total,
          paymentMethod,
          notes: body.notes ? String(body.notes) : null,
          cashier: user.name || user.email,
          cashierUserId: user.id,
          businessId,
          items: {
            create: normalizedItems.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              price: i.price,
              cost: i.cost,
              productId: i.productId,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of normalizedItems) {
        if (item.productId && !item.isService) {
          await tx.product.updateMany({
            where: { id: item.productId, businessId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      // AIDE-10: append the sale to the inventory movement ledger in the
      // same transaction so stock on hand stays explainable.
      await recordSaleMovements(tx, { businessId, saleId: created.id, items: normalizedItems });

      return created;
    });

    const accountCount = await prisma.account.count({ where: { businessId } });
    if (accountCount === 0) {
      await seedChartOfAccounts(businessId);
    }

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
      console.error(`[AIDE-06] Failed to post sale ${sale.id} to GL:`, postingErr);
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
