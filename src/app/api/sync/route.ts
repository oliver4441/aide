import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveConflict, checkStockOversell } from "@/lib/conflicts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
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
          await handleProductMutation(action, recordId, data, deviceId, conflicts);
        } else if (table === "categories") {
          await handleCategoryMutation(action, recordId, data);
        } else if (table === "sales") {
          await handleSaleMutation(action, recordId, data, deviceId, conflicts);
        }
        synced++;
      } catch (err: any) {
        console.error(`Mutation failed for ${table}/${recordId}:`, err.message);
      }
    }

    return NextResponse.json({ synced, conflicts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function handleProductMutation(
  action: string,
  recordId: string,
  data: any,
  deviceId: string,
  conflicts: any[]
) {
  if (action === "delete") {
    await prisma.product.update({
      where: { id: recordId },
      data: { isActive: false },
    }).catch(() => {});
    return;
  }

  const existing = await prisma.product.findUnique({ where: { id: recordId } });

  if (existing) {
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
            businessId: data.businessId,
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
        businessId: data.businessId,
      },
    });
  }
}

async function handleCategoryMutation(action: string, recordId: string, data: any) {
  if (action === "delete") {
    await prisma.category.delete({ where: { id: recordId } }).catch(() => {});
    return;
  }

  const existing = await prisma.category.findUnique({ where: { id: recordId } });

  if (existing) {
    await prisma.category.update({
      where: { id: recordId },
      data: { name: data.name, sortOrder: data.sortOrder },
    });
  } else {
    await prisma.category.create({
      data: {
        id: recordId,
        name: data.name,
        sortOrder: data.sortOrder || 0,
        businessId: data.businessId,
      },
    });
  }
}

async function handleSaleMutation(
  action: string,
  recordId: string,
  data: any,
  deviceId: string,
  conflicts: any[]
) {
  const existing = await prisma.sale.findUnique({ where: { id: recordId } });
  if (existing) return;

  const saleData = data.sale || data;
  const items = data.items || [];

  await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
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
        businessId: saleData.businessId,
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
          saleId: created.id,
          productId: item.productId || null,
        },
      });
    }

    for (const item of items) {
      if (item.productId) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product) {
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
                businessId: saleData.businessId,
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
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since") || "0";
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json({ error: "businessId required" }, { status: 400 });
  }

  const sinceDate = new Date(since);

  const [business, products, categories, sales, saleItems] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId } }),
    prisma.product.findMany({
      where: { businessId, updatedAt: { gt: sinceDate } },
    }),
    prisma.category.findMany({
      where: { businessId, createdAt: { gt: sinceDate } },
    }),
    prisma.sale.findMany({
      where: { businessId, createdAt: { gt: sinceDate } },
    }),
    prisma.saleItem.findMany({
      where: {
        sale: { businessId, createdAt: { gt: sinceDate } },
      },
    }),
  ]);

  return NextResponse.json({ business, products, categories, sales, saleItems });
}
