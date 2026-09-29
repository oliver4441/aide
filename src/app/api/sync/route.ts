import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveConflict, checkStockOversell } from "@/lib/conflicts";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mutations, deviceId, businessId: requestedBusinessId } = body;

    if (!mutations || !Array.isArray(mutations)) {
      return NextResponse.json({ error: "mutations array required" }, { status: 400 });
    }

    // Authorize once, then scope every mutation to the caller's own business.
    const { user, businessId } = await requireBusiness(requestedBusinessId, request);

    let synced = 0;
    const conflicts: any[] = [];

    for (const mutation of mutations) {
      const { table, action, recordId, data } = mutation;

      try {
        if (table === "products") {
          await handleProductMutation(action, recordId, data, deviceId, conflicts, businessId);
        } else if (table === "categories") {
          await handleCategoryMutation(action, recordId, data, businessId);
        } else if (table === "sales") {
          await handleSaleMutation(action, recordId, data, deviceId, conflicts, businessId);
        }
        synced++;
      } catch (err: any) {
        console.error(`Mutation failed for ${table}/${recordId}:`, err.message);
      }
    }

    return NextResponse.json({ synced, conflicts });
  } catch (err: any) {
    return toAuthError(err);
  }
}

async function handleProductMutation(
  action: string,
  recordId: string,
  data: any,
  deviceId: string,
  conflicts: any[],
  businessId: string
) {
  if (action === "delete") {
    // Never soft-delete another tenant's product just because its id was sent.
    await prisma.product.updateMany({
      where: { id: recordId, businessId },
      data: { isActive: false },
    });
    return;
  }

  const existing = await prisma.product.findFirst({ where: { id: recordId, businessId } });

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
            businessId,
          },
        });
        conflicts.push(conflict);
        return;
      }

      if (result.resolution === "server-wins") return;
    }

    await prisma.product.update({
      where: { id: recordId },      data: {
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
        businessId,
      },
    });
  }
}

async function handleCategoryMutation(
  action: string,
  recordId: string,
  data: any,
  businessId: string
) {
  if (action === "delete") {
    await prisma.category.deleteMany({ where: { id: recordId, businessId } });
    return;
  }

  const existing = await prisma.category.findFirst({ where: { id: recordId, businessId } });

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
  businessId: string
) {
  const existing = await prisma.sale.findFirst({ where: { id: recordId, businessId } });
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
          saleId: created.id,
          productId: item.productId || null,
        },
      });
    }

    for (const item of items) {
      if (item.productId) {
        // Scoped to the caller's business so a sale can never decrement
        // another tenant's stock by referencing a foreign productId.
        const product = await tx.product.findFirst({
          where: { id: item.productId, businessId },
        });
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
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since") || "0";
    const requestedBusinessId = searchParams.get("businessId");

    // A requested businessId is honoured only if the caller belongs to it;
    // otherwise we fall back to their own. No cross-tenant reads.
    const { businessId } = await requireBusiness(requestedBusinessId, request);

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
  } catch (err) {
    return toAuthError(err);
  }
}
