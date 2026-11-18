import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, canAccessBusiness, toAuthError } from "@/lib/apiAuth";
import { resolveConflict, checkStockOversell } from "@/lib/conflicts";
import { postSale, seedChartOfAccounts } from "@/lib/accounting/post";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { user, businessId, businessIds } = await requireBusiness(null, request);

    const body = await request.json();
    const { mutations, deviceId } = body;

    if (!mutations || !Array.isArray(mutations)) {
      return NextResponse.json({ error: "mutations array required" }, { status: 400 });
    }

    let synced = 0;
    const conflicts: any[] = [];

    for (const mutation of mutations) {
      const { table, action, recordId, data } = mutation;

      try {
        if (table === "products") {
          await handleProductMutation(action, recordId, data, deviceId, conflicts, user, businessIds);
        } else if (table === "categories") {
          await handleCategoryMutation(action, recordId, data, user, businessIds);
        } else if (table === "sales") {
          await handleSaleMutation(action, recordId, data, deviceId, conflicts, user, businessIds);
        }
        synced++;
      } catch (err: any) {
        console.error(`Mutation failed for ${table}/${recordId}:`, err.message);
      }
    }

    return NextResponse.json({ synced, conflicts });
  } catch (err) {
    return toAuthError(err);
  }
}

async function handleProductMutation(
  action: string,
  recordId: string,
  data: any,
  deviceId: string,
  conflicts: any[],
  user: { id: string },
  businessIds: string[]
) {
  if (action === "delete") {
    const existing = await prisma.product.findUnique({ where: { id: recordId } });
    if (!existing) return;
    if (!businessIds.includes(existing.businessId)) return;

    await prisma.product.update({
      where: { id: recordId },
      data: { isActive: false },
    }).catch(() => {});
    return;
  }

  const existing = await prisma.product.findUnique({ where: { id: recordId } });

  if (existing) {
    if (!businessIds.includes(existing.businessId)) return;

    if (new Date(existing.updatedAt).getTime() !== new Date(data.updatedAt).getTime()) {
      const result = resolveConflict({
        entityType: "product",
        entityId: recordId,
        clientData: { ...data, deviceId },
        serverData: { ...existing, deviceId: existing.id },
      });

      if (result.resolution === "manual-review") {
        const conflict = await prisma.syncConflict.create({
          data: {
            entityType: "product",
            entityId: recordId,
            clientData: data,
            serverData: existing,
            resolution: "manual-review",
            status: "PENDING_OWNER",
            businessId: existing.businessId,
          },
        });
        conflicts.push(conflict);
        return;
      }

      if (result.resolution === "server-wins") return;
    }

    await prisma.product.update({
      where: { id: recordId },
      data: {
        name: data.name,
        sku: data.sku,
        buyingPrice: data.buyingPrice,
        sellingPrice: data.sellingPrice,
        quantity: data.quantity,
        lowStock: data.lowStock,
        isService: data.isService,
        categoryId: data.categoryId,
      },
    });
  } else {
    const businessId = data.businessId && businessIds.includes(data.businessId)
      ? data.businessId
      : businessIds[0];
    if (!businessId) return;

    await prisma.product.create({
      data: {
        id: recordId,
        name: data.name,
        sku: data.sku,
        buyingPrice: data.buyingPrice,
        sellingPrice: data.sellingPrice,
        quantity: data.quantity,
        lowStock: data.lowStock,
        isService: data.isService,
        categoryId: data.categoryId,
        businessId,
      },
    });
  }
}

async function handleCategoryMutation(
  action: string,
  recordId: string,
  data: any,
  user: { id: string },
  businessIds: string[]
) {
  if (action === "delete") {
    const existing = await prisma.category.findUnique({ where: { id: recordId } });
    if (!existing) return;
    if (!businessIds.includes(existing.businessId)) return;

    await prisma.category.delete({ where: { id: recordId } }).catch(() => {});
    return;
  }

  const existing = await prisma.category.findUnique({ where: { id: recordId } });

  if (existing) {
    if (!businessIds.includes(existing.businessId)) return;

    await prisma.category.update({
      where: { id: recordId },
      data: { name: data.name, sortOrder: data.sortOrder },
    });
  } else {
    const businessId = data.businessId && businessIds.includes(data.businessId)
      ? data.businessId
      : businessIds[0];
    if (!businessId) return;

    await prisma.category.create({
      data: {
        id: recordId,
        name: data.name,
        sortOrder: data.sortOrder || 0,
        businessId,
      },
    });
  }
}

async function handleSaleMutation(
  action: string,
  recordId: string,
  data: any,
  deviceId: string,
  conflicts: any[],
  user: { id: string },
  businessIds: string[]
) {
  const existing = await prisma.sale.findUnique({ where: { id: recordId } });
  if (existing) return;

  const saleData = data.sale || data;
  const items = data.items || [];
  const businessId = saleData.businessId && businessIds.includes(saleData.businessId)
    ? saleData.businessId
    : businessIds[0];
  if (!businessId) return;

  const created = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        id: recordId,
        total: saleData.total,
        cost: saleData.cost,
        profit: saleData.profit,
        paid: saleData.paid,
        change: saleData.change,
        tax: saleData.tax || 0,
        taxRate: saleData.taxRate || 0,
        paymentMethod: saleData.paymentMethod || "CASH",
        notes: saleData.notes,
        cashier: saleData.cashier,
        businessId,
      },
    });

    for (const item of items) {
      await tx.saleItem.create({
        data: {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          cost: item.cost,
          saleId: sale.id,
          productId: item.productId || null,
        },
      });
    }

    for (const item of items) {
      if (item.productId) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product && businessIds.includes(product.businessId)) {
          const movements = items
            .filter((i: any) => i.productId === item.productId)
            .map((i: any) => ({ delta: -i.quantity, timestamp: saleData.createdAt || new Date().toISOString() }));

          const check = checkStockOversell(item.productId, product.quantity + item.quantity, movements);
          if (!check.ok) {
            const conflict = await tx.syncConflict.create({
              data: {
                entityType: "product",
                entityId: item.productId,
                clientData: { quantity: check.finalQuantity },
                serverData: { quantity: product.quantity },
                resolution: "manual-review",
                status: "PENDING_OWNER",
                businessId,
              },
            });
            conflicts.push(conflict);
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }
    }

    return sale;
  });

  // Auto-seed chart of accounts if this is the first sale
  const accountCount = await prisma.account.count({ where: { businessId } });
  if (accountCount === 0) {
    await seedChartOfAccounts(businessId);
  }

  // Auto-post synced sale to general ledger (non-blocking)
  try {
    await postSale({
      businessId,
      saleId: created.id,
      total: Number(created.total),
      cost: Number(created.cost),
      tax: Number(created.tax),
      paymentMethod: created.paymentMethod,
      date: created.createdAt,
    });
  } catch (postingErr) {
    console.error(`[AIDE-06] Failed to post synced sale ${created.id} to GL:`, postingErr);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since") || "0";
    const requestedBusinessId = searchParams.get("businessId");

    if (!requestedBusinessId) {
      return NextResponse.json({ error: "businessId required" }, { status: 400 });
    }

    const { businessId, businessIds } = await requireBusiness(requestedBusinessId, request);

    // Verify the requested businessId is in the caller's accessible set
    if (!businessIds.includes(requestedBusinessId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sinceDate = new Date(since);

    const [business, products, categories, sales, saleItems] = await Promise.all([
      prisma.business.findUnique({ where: { id: requestedBusinessId } }),
      prisma.product.findMany({
        where: { businessId: requestedBusinessId, updatedAt: { gt: sinceDate } },
      }),
      prisma.category.findMany({
        where: { businessId: requestedBusinessId, createdAt: { gt: sinceDate } },
      }),
      prisma.sale.findMany({
        where: { businessId: requestedBusinessId, createdAt: { gt: sinceDate } },
      }),
      prisma.saleItem.findMany({
        where: {
          sale: { businessId: requestedBusinessId, createdAt: { gt: sinceDate } },
        },
      }),
    ]);

    return NextResponse.json({ business, products, categories, sales, saleItems });
  } catch (err) {
    return toAuthError(err);
  }
}
