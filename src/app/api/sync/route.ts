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
        } else if (table === "accounts") {
          await handleGenericMutation("account", action, recordId, data, businessIds);
        } else if (table === "journalEntries") {
          await handleGenericMutation("journalEntry", action, recordId, data, businessIds);
        } else if (table === "journalLines") {
          await handleGenericMutation("journalLine", action, recordId, data, businessIds);
        } else if (table === "customers") {
          await handleGenericMutation("customer", action, recordId, data, businessIds);
        } else if (table === "invoices") {
          await handleGenericMutation("invoice", action, recordId, data, businessIds);
        } else if (table === "invoiceLines") {
          await handleGenericMutation("invoiceLine", action, recordId, data, businessIds);
        } else if (table === "paymentAllocations") {
          await handleGenericMutation("paymentAllocation", action, recordId, data, businessIds);
        } else if (table === "suppliers") {
          await handleGenericMutation("supplier", action, recordId, data, businessIds);
        } else if (table === "purchaseOrders") {
          await handleGenericMutation("purchaseOrder", action, recordId, data, businessIds);
        } else if (table === "purchaseOrderLines") {
          await handleGenericMutation("purchaseOrderLine", action, recordId, data, businessIds);
        } else if (table === "supplierInvoices") {
          await handleGenericMutation("supplierInvoice", action, recordId, data, businessIds);
        } else if (table === "stockAdjustments") {
          await handleGenericMutation("stockAdjustment", action, recordId, data, businessIds);
        } else if (table === "stockAdjustmentLines") {
          await handleGenericMutation("stockAdjustmentLine", action, recordId, data, businessIds);
        } else if (table === "refunds") {
          await handleGenericMutation("refund", action, recordId, data, businessIds);
        } else if (table === "refundLines") {
          await handleGenericMutation("refundLine", action, recordId, data, businessIds);
        } else if (table === "cashierShifts") {
          await handleGenericMutation("cashierShift", action, recordId, data, businessIds);
        } else if (table === "splitPayments") {
          await handleGenericMutation("splitPayment", action, recordId, data, businessIds);
        } else if (table === "employees") {
          await handleGenericMutation("employee", action, recordId, data, businessIds);
        } else if (table === "invitations") {
          await handleGenericMutation("invitation", action, recordId, data, businessIds);
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

// Generic mutation handler for models that don't need special conflict resolution.
// Uses soft-delete (deletedAt) for delete actions where supported.
async function handleGenericMutation(
  modelName: string,
  action: string,
  recordId: string,
  data: any,
  businessIds: string[]
) {
  const model = (prisma as any)[modelName];
  if (!model) {
    console.error(`[sync] Unknown model: ${modelName}`);
    return;
  }

  if (action === "delete") {
    const existing = await model.findUnique({ where: { id: recordId } }).catch(() => null);
    if (!existing) return;
    if (!businessIds.includes(existing.businessId)) return;
    // Soft delete if supported, else hard delete
    if (model.update) {
      await model.update({
        where: { id: recordId },
        data: { deletedAt: new Date() },
      }).catch(() => {
        // If soft delete fails (no deletedAt field), try hard delete
        model.delete({ where: { id: recordId } }).catch(() => {});
      });
    }
    return;
  }

  const existing = await model.findUnique({ where: { id: recordId } }).catch(() => null);
  if (existing) {
    if (!businessIds.includes(existing.businessId)) return;
    // Update with client data, filtering out read-only fields
    const updateData = { ...data };
    delete updateData.id;
    delete updateData.businessId;
    delete updateData.createdAt;
    delete updateData.deletedAt;
    await model.update({
      where: { id: recordId },
      data: updateData,
    }).catch(() => {});
  } else {
    const businessId = data.businessId && businessIds.includes(data.businessId)
      ? data.businessId
      : businessIds[0];
    if (!businessId) return;
    const createData = { ...data, businessId };
    await model.create({ data: createData }).catch(() => {});
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
    const w = { businessId: requestedBusinessId };

    const [
      business, products, categories, sales, saleItems,
      // AIDE-05: Accounting
      accounts, journalEntries, journalLines,
      // AIDE-08: Customers & AR
      customers, invoices, invoiceLines, paymentAllocations,
      // AIDE-09: Suppliers & AP
      suppliers, purchaseOrders, purchaseOrderLines, supplierInvoices,
      // AIDE-10: Inventory advanced
      stockAdjustments, stockAdjustmentLines,
      // AIDE-11: POS advanced
      refunds, refundLines, cashierShifts, splitPayments,
      // AIDE-03: RBAC
      employees, invitations,
    ] = await Promise.all([
      prisma.business.findUnique({ where: { id: requestedBusinessId } }),
      prisma.product.findMany({ where: { ...w, updatedAt: { gt: sinceDate } } }),
      prisma.category.findMany({ where: { ...w, createdAt: { gt: sinceDate } } }),
      prisma.sale.findMany({ where: { ...w, createdAt: { gt: sinceDate } } }),
      prisma.saleItem.findMany({ where: { sale: { businessId: requestedBusinessId, createdAt: { gt: sinceDate } } } }),
      // Accounting — JournalLine has no businessId, so fetch by entry relation
      prisma.account.findMany({ where: w }),
      prisma.journalEntry.findMany({ where: w, orderBy: { date: 'desc' } }),
      prisma.journalLine.findMany({ where: { entry: { businessId: requestedBusinessId } } }),
      // Customers & AR — InvoiceLine has no businessId
      prisma.customer.findMany({ where: w }),
      prisma.invoice.findMany({ where: w, orderBy: { createdAt: 'desc' } }),
      prisma.invoiceLine.findMany({ where: { invoice: { businessId: requestedBusinessId } } }),
      prisma.paymentAllocation.findMany({ where: w }),
      // Suppliers & AP — PurchaseOrderLine has no businessId
      prisma.supplier.findMany({ where: w }),
      prisma.purchaseOrder.findMany({ where: w, orderBy: { createdAt: 'desc' } }),
      prisma.purchaseOrderLine.findMany({ where: { purchaseOrder: { businessId: requestedBusinessId } } }),
      prisma.supplierInvoice.findMany({ where: w, orderBy: { createdAt: 'desc' } }),
      // Inventory — StockAdjustmentLine has no businessId
      prisma.stockAdjustment.findMany({ where: w, orderBy: { createdAt: 'desc' } }),
      prisma.stockAdjustmentLine.findMany({ where: { adjustment: { businessId: requestedBusinessId } } }),
      // POS advanced — RefundLine has no businessId
      prisma.refund.findMany({ where: w, orderBy: { createdAt: 'desc' } }),
      prisma.refundLine.findMany({ where: { refund: { businessId: requestedBusinessId } } }),
      prisma.cashierShift.findMany({ where: w, orderBy: { openedAt: 'desc' } }),
      prisma.splitPayment.findMany({ where: w }),
      // RBAC
      prisma.employee.findMany({ where: w }),
      prisma.invitation.findMany({ where: { ...w, expiresAt: { gt: new Date() } } }),
    ]);

    return NextResponse.json({
      business, products, categories, sales, saleItems,
      accounts, journalEntries, journalLines,
      customers, invoices, invoiceLines, paymentAllocations,
      suppliers, purchaseOrders, purchaseOrderLines, supplierInvoices,
      stockAdjustments, stockAdjustmentLines,
      refunds, refundLines, cashierShifts, splitPayments,
      employees, invitations,
    });
  } catch (err) {
    return toAuthError(err);
  }
}
