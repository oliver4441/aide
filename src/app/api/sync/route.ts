import { NextRequest, NextResponse } from "next/server";
import { BusinessRole, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { resolveConflict, checkStockOversell } from "@/lib/conflicts";
import { postSale, seedChartOfAccounts } from "@/lib/accounting/post";
import { hasPermission, Permission } from "@/lib/rbac";
import { selectPolicy } from "@/lib/approvalEngine.mjs";

export const dynamic = "force-dynamic";

function parseSinceDate(since: string | null): Date | null {
  if (!since || since === "0") return new Date(0);
  if (/^\d+$/.test(since)) {
    const ms = Number(since);
    return Number.isFinite(ms) ? new Date(ms) : null;
  }
  const parsed = new Date(since);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mutations, deviceId } = body;

    const { user, businessId } = await requireBusiness(body?.businessId ?? null, request);
    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!mutations || !Array.isArray(mutations)) {
      return NextResponse.json({ error: "mutations array required" }, { status: 400 });
    }

    let synced = 0;
    const conflicts: any[] = [];
    const failed: Array<{ table: string; recordId: string; error: string }> = [];

    for (const mutation of mutations) {
      const table = String(mutation?.table || "");
      const action = String(mutation?.action || "");
      const recordId = String(mutation?.recordId || "");
      const data = mutation?.data;

      if (!recordId) {
        failed.push({ table, recordId, error: "recordId is required" });
        continue;
      }

      try {
        if (table === "products") {
          await handleProductMutation(
            action,
            recordId,
            data,
            String(deviceId || ""),
            conflicts,
            membership.role,
            businessId
          );
          synced++;
        } else if (table === "categories") {
          await handleCategoryMutation(action, recordId, data, membership.role, businessId);
          synced++;
        } else if (table === "sales") {
          await handleSaleMutation(
            action,
            recordId,
            data,
            conflicts,
            membership.role,
            businessId
          );
          synced++;
        } else {
          failed.push({ table, recordId, error: `Unsupported sync table: ${table}` });
        }
      } catch (err: any) {
        console.error(`Mutation failed for ${table}/${recordId}:`, err?.message);
        failed.push({
          table,
          recordId,
          error: err?.message || "Sync mutation failed",
        });
      }
    }

    return NextResponse.json({ synced, conflicts, failed });
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
  role: BusinessRole,
  businessId: string
) {
  if (action === "delete") {
    if (!hasPermission(role, Permission.PRODUCT_DELETE)) {
      throw new Error("Forbidden");
    }
    const existing = await prisma.product.findUnique({ where: { id: recordId } });
    if (!existing) return;
    if (existing.businessId !== businessId) {
      throw new Error("Forbidden");
    }

    await prisma.product.update({
      where: { id: recordId },
      data: { isActive: false },
    });
    return;
  }

  const existing = await prisma.product.findUnique({ where: { id: recordId } });

  if (existing) {
    if (!hasPermission(role, Permission.PRODUCT_UPDATE)) {
      throw new Error("Forbidden");
    }
    if (existing.businessId !== businessId) {
      throw new Error("Forbidden");
    }

    const nextSellingPrice =
      data?.sellingPrice !== undefined ? Number(data.sellingPrice) : Number(existing.sellingPrice);
    if (!Number.isFinite(nextSellingPrice) || nextSellingPrice < 0) {
      throw new Error("Invalid sellingPrice");
    }
    if (nextSellingPrice !== Number(existing.sellingPrice)) {
      const policies = await prisma.approvalPolicy.findMany({
        where: { businessId, active: true, actionType: "PRICE_CHANGE" },
      });
      const pricePolicy = selectPolicy(
        policies,
        "PRICE_CHANGE",
        Math.abs(nextSellingPrice - Number(existing.sellingPrice))
      );
      if (pricePolicy) {
        throw new Error("Price change requires approval via /api/products/[id]");
      }
    }

    const nextCategoryId =
      data?.categoryId !== undefined ? data.categoryId || null : existing.categoryId;
    if (nextCategoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: nextCategoryId, businessId },
        select: { id: true },
      });
      if (!cat) {
        throw new Error("Category not found in this business");
      }
    }

    if (
      data?.updatedAt &&
      new Date(existing.updatedAt).getTime() !== new Date(data.updatedAt).getTime()
    ) {
      const result = resolveConflict({
        entityType: "product",
        entityId: recordId,
        clientData: { ...data, deviceId },
        serverData: { ...existing, deviceId: undefined },
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

    const buyingPrice =
      data?.buyingPrice !== undefined ? Number(data.buyingPrice) : Number(existing.buyingPrice);
    const quantity = data?.quantity !== undefined ? Number(data.quantity) : existing.quantity;
    const lowStock = data?.lowStock !== undefined ? Number(data.lowStock) : existing.lowStock;
    if (
      !Number.isFinite(buyingPrice) ||
      buyingPrice < 0 ||
      !Number.isInteger(quantity) ||
      !Number.isInteger(lowStock) ||
      lowStock < 0
    ) {
      throw new Error("Invalid product numbers");
    }

    await prisma.product.update({
      where: { id: recordId },
      data: {
        name: typeof data?.name === "string" && data.name.trim() ? data.name.trim() : existing.name,
        sku: data?.sku !== undefined ? data.sku?.trim() || null : existing.sku,
        buyingPrice,
        sellingPrice: nextSellingPrice,
        quantity,
        lowStock,
        isService: data?.isService !== undefined ? Boolean(data.isService) : existing.isService,
        isActive: typeof data?.isActive === "boolean" ? data.isActive : existing.isActive,
        categoryId: nextCategoryId,
        imageUrl: data?.imageUrl !== undefined ? data.imageUrl || null : existing.imageUrl,
        thumbnailUrl: data?.thumbnailUrl !== undefined ? data.thumbnailUrl || null : existing.thumbnailUrl,
      },
    });
  } else {
    if (!hasPermission(role, Permission.PRODUCT_CREATE)) {
      throw new Error("Forbidden");
    }
    const name = typeof data?.name === "string" ? data.name.trim() : "";
    if (!name) {
      throw new Error("Product name is required");
    }
    const buyingPrice = Number(data?.buyingPrice ?? 0);
    const sellingPrice = Number(data?.sellingPrice ?? 0);
    const quantity = Number(data?.quantity ?? 0);
    const lowStock = Number(data?.lowStock ?? 5);
    if (
      !Number.isFinite(buyingPrice) ||
      buyingPrice < 0 ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0 ||
      !Number.isInteger(quantity) ||
      !Number.isInteger(lowStock) ||
      lowStock < 0
    ) {
      throw new Error("Invalid product values");
    }
    if (data?.categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: String(data.categoryId), businessId },
        select: { id: true },
      });
      if (!cat) {
        throw new Error("Category not found in this business");
      }
    }

    await prisma.product.create({
      data: {
        id: recordId,
        name,
        sku: data?.sku?.trim() || null,
        buyingPrice,
        sellingPrice,
        quantity,
        lowStock,
        isService: Boolean(data?.isService),
        isActive: typeof data?.isActive === "boolean" ? data.isActive : true,
        categoryId: data?.categoryId || null,
        imageUrl: data?.imageUrl || null,
        thumbnailUrl: data?.thumbnailUrl || null,
        businessId,
      },
    });
  }
}

async function handleCategoryMutation(
  action: string,
  recordId: string,
  data: any,
  role: BusinessRole,
  businessId: string
) {
  if (action === "delete") {
    if (!hasPermission(role, Permission.PRODUCT_DELETE)) {
      throw new Error("Forbidden");
    }
    const existing = await prisma.category.findUnique({ where: { id: recordId } });
    if (!existing) return;
    if (existing.businessId !== businessId) {
      throw new Error("Forbidden");
    }

    await prisma.category.delete({ where: { id: recordId } });
    return;
  }

  const existing = await prisma.category.findUnique({ where: { id: recordId } });

  if (existing) {
    if (!hasPermission(role, Permission.PRODUCT_UPDATE)) {
      throw new Error("Forbidden");
    }
    if (existing.businessId !== businessId) {
      throw new Error("Forbidden");
    }
    const name = typeof data?.name === "string" && data.name.trim() ? data.name.trim() : existing.name;
    const sortOrder =
      data?.sortOrder !== undefined && Number.isInteger(Number(data.sortOrder))
        ? Number(data.sortOrder)
        : existing.sortOrder;

    await prisma.category.update({
      where: { id: recordId },
      data: { name, sortOrder },
    });
  } else {
    if (!hasPermission(role, Permission.PRODUCT_CREATE)) {
      throw new Error("Forbidden");
    }
    const name = typeof data?.name === "string" ? data.name.trim() : "";
    if (!name) {
      throw new Error("Category name is required");
    }

    await prisma.category.create({
      data: {
        id: recordId,
        name,
        sortOrder: Number.isInteger(Number(data?.sortOrder)) ? Number(data.sortOrder) : 0,
        businessId,
      },
    });
  }
}

async function handleSaleMutation(
  action: string,
  recordId: string,
  data: any,
  conflicts: any[],
  role: BusinessRole,
  businessId: string
) {
  if (action === "delete") {
    throw new Error("Deleting sales via sync is not supported");
  }
  if (!hasPermission(role, Permission.SALE_CREATE)) {
    throw new Error("Forbidden");
  }

  const existing = await prisma.sale.findUnique({ where: { id: recordId } });
  if (existing) {
    if (existing.businessId !== businessId) {
      throw new Error("Forbidden");
    }
    return;
  }

  const saleData = data?.sale || data;
  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) {
    throw new Error("Sale must have at least one item");
  }

  const total = Number(saleData?.total);
  const cost = Number(saleData?.cost ?? 0);
  const profit = Number(saleData?.profit ?? total - cost);
  const paid = Number(saleData?.paid ?? total);
  const change = Number(saleData?.change ?? Math.max(0, paid - total));
  const tax = Number(saleData?.tax ?? 0);
  const taxRate = Number(saleData?.taxRate ?? 0);

  if (
    !Number.isFinite(total) ||
    total < 0 ||
    !Number.isFinite(cost) ||
    cost < 0 ||
    !Number.isFinite(profit) ||
    !Number.isFinite(paid) ||
    paid < 0 ||
    !Number.isFinite(change) ||
    change < 0 ||
    !Number.isFinite(tax) ||
    tax < 0 ||
    !Number.isFinite(taxRate) ||
    taxRate < 0
  ) {
    throw new Error("Invalid sale monetary totals");
  }

  const rawMethod = String(saleData?.paymentMethod || "CASH");
  const paymentMethod = (
    rawMethod === "MPESA" ? "MOBILE_MONEY" : rawMethod
  ) as PaymentMethod;
  if (!Object.values(PaymentMethod).includes(paymentMethod)) {
    throw new Error(`Invalid paymentMethod: ${rawMethod}`);
  }

  for (const item of items) {
    const qty = Number(item?.quantity);
    const price = Number(item?.price);
    const itemCost = Number(item?.cost ?? 0);
    if (
      !item?.name ||
      !Number.isInteger(qty) ||
      qty <= 0 ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isFinite(itemCost) ||
      itemCost < 0
    ) {
      throw new Error("Invalid sale item");
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        id: recordId,
        total,
        cost,
        profit,
        paid,
        change,
        tax,
        taxRate,
        paymentMethod,
        notes: saleData?.notes?.trim() || null,
        cashier: saleData?.cashier?.trim() || null,
        businessId,
      },
    });

    const movementsByProduct = new Map<
      string,
      Array<{ delta: number; timestamp: string }>
    >();

    for (const item of items) {
      let validProductId: string | null = null;
      if (item.productId) {
        const product = await tx.product.findUnique({
          where: { id: String(item.productId) },
          select: { id: true, businessId: true },
        });
        if (!product || product.businessId !== businessId) {
          throw new Error(`Product ${item.productId} does not belong to business`);
        }
        validProductId = product.id;

        const list = movementsByProduct.get(validProductId) ?? [];
        list.push({
          delta: -Number(item.quantity),
          timestamp: saleData?.createdAt || new Date().toISOString(),
        });
        movementsByProduct.set(validProductId, list);
      }

      await tx.saleItem.create({
        data: {
          id: item.id || undefined,
          name: String(item.name),
          quantity: Number(item.quantity),
          price: Number(item.price),
          cost: Number(item.cost ?? 0),
          saleId: sale.id,
          productId: validProductId,
        },
      });
    }

    for (const [productId, movements] of Array.from(movementsByProduct.entries())) {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product || product.isService) continue;

      const totalQty = movements.reduce((sum, m) => sum + Math.abs(m.delta), 0);
      const check = checkStockOversell(productId, product.quantity, movements);
      if (!check.ok) {
        const conflict = await tx.syncConflict.create({
          data: {
            entityType: "product",
            entityId: productId,
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
        where: { id: productId },
        data: { quantity: { decrement: totalQty } },
      });
    }

    return sale;
  });

  const accountCount = await prisma.account.count({ where: { businessId } });
  if (accountCount === 0) {
    await seedChartOfAccounts(businessId);
  }

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

    const sinceDate = parseSinceDate(since);
    if (!sinceDate) {
      return NextResponse.json({ error: "Invalid since timestamp" }, { status: 400 });
    }

    const limitParam = parseInt(searchParams.get("limit") || "1000", 10);
    const take = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 2000) : 1000;

    const { user, businessId } = await requireBusiness(requestedBusinessId, request);
    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const role = membership.role;
    const w = { businessId };
    const canReadAccounts = hasPermission(role, Permission.ACCOUNT_READ);
    const canReadJournals = hasPermission(role, Permission.JOURNAL_READ);
    const canReadCustomers = hasPermission(role, Permission.CUSTOMER_READ);
    const canReadSuppliers = hasPermission(role, Permission.SUPPLIER_READ);
    const canReadPOs = hasPermission(role, Permission.PURCHASE_ORDER_READ);
    const canReadSupInvoices = hasPermission(role, Permission.SUPPLIER_INVOICE_READ);
    const canReadAdjustments = hasPermission(role, Permission.STOCK_ADJUST_READ);
    const canReadRefunds = hasPermission(role, Permission.REFUND_READ);
    const canReadEmployees = hasPermission(role, Permission.EMPLOYEE_MANAGE);
    const canReadInvitations =
      hasPermission(role, Permission.EMPLOYEE_INVITE) ||
      hasPermission(role, Permission.EMPLOYEE_MANAGE);

    const [
      business,
      products,
      categories,
      sales,
      saleItems,
      accounts,
      journalEntries,
      journalLines,
      customers,
      invoices,
      invoiceLines,
      paymentAllocations,
      suppliers,
      purchaseOrders,
      purchaseOrderLines,
      supplierInvoices,
      stockAdjustments,
      stockAdjustmentLines,
      refunds,
      refundLines,
      cashierShifts,
      splitPayments,
      employees,
      invitations,
    ] = await Promise.all([
      prisma.business.findUnique({ where: { id: businessId } }),
      hasPermission(role, Permission.PRODUCT_READ)
        ? prisma.product.findMany({ where: { ...w, updatedAt: { gt: sinceDate } }, take })
        : [],
      hasPermission(role, Permission.PRODUCT_READ)
        ? prisma.category.findMany({ where: { ...w, createdAt: { gt: sinceDate } }, take })
        : [],
      hasPermission(role, Permission.SALE_READ)
        ? prisma.sale.findMany({
            where: { ...w, createdAt: { gt: sinceDate } },
            orderBy: { createdAt: "desc" },
            take,
          })
        : [],
      hasPermission(role, Permission.SALE_READ)
        ? prisma.saleItem.findMany({
            where: { sale: { businessId, createdAt: { gt: sinceDate } } },
            take,
          })
        : [],
      canReadAccounts
        ? prisma.account.findMany({ where: { ...w, updatedAt: { gt: sinceDate } }, take })
        : [],
      canReadJournals
        ? prisma.journalEntry.findMany({
            where: { ...w, updatedAt: { gt: sinceDate } },
            orderBy: { date: "desc" },
            take,
          })
        : [],
      canReadJournals
        ? prisma.journalLine.findMany({
            where: { entry: { businessId, updatedAt: { gt: sinceDate } } },
            take,
          })
        : [],
      canReadCustomers
        ? prisma.customer.findMany({ where: { ...w, updatedAt: { gt: sinceDate } }, take })
        : [],
      canReadCustomers
        ? prisma.invoice.findMany({
            where: { ...w, updatedAt: { gt: sinceDate } },
            orderBy: { createdAt: "desc" },
            take,
          })
        : [],
      canReadCustomers
        ? prisma.invoiceLine.findMany({
            where: { invoice: { businessId, updatedAt: { gt: sinceDate } } },
            take,
          })
        : [],
      canReadCustomers
        ? prisma.paymentAllocation.findMany({
            where: { ...w, paidAt: { gt: sinceDate } },
            take,
          })
        : [],
      canReadSuppliers
        ? prisma.supplier.findMany({ where: { ...w, updatedAt: { gt: sinceDate } }, take })
        : [],
      canReadPOs
        ? prisma.purchaseOrder.findMany({
            where: { ...w, updatedAt: { gt: sinceDate } },
            orderBy: { createdAt: "desc" },
            take,
          })
        : [],
      canReadPOs
        ? prisma.purchaseOrderLine.findMany({
            where: { purchaseOrder: { businessId, updatedAt: { gt: sinceDate } } },
            take,
          })
        : [],
      canReadSupInvoices
        ? prisma.supplierInvoice.findMany({
            where: { ...w, updatedAt: { gt: sinceDate } },
            orderBy: { createdAt: "desc" },
            take,
          })
        : [],
      canReadAdjustments
        ? prisma.stockAdjustment.findMany({
            where: { ...w, createdAt: { gt: sinceDate } },
            orderBy: { createdAt: "desc" },
            take,
          })
        : [],
      canReadAdjustments
        ? prisma.stockAdjustmentLine.findMany({
            where: { adjustment: { businessId, createdAt: { gt: sinceDate } } },
            take,
          })
        : [],
      canReadRefunds
        ? prisma.refund.findMany({
            where: { ...w, updatedAt: { gt: sinceDate } },
            orderBy: { createdAt: "desc" },
            take,
          })
        : [],
      canReadRefunds
        ? prisma.refundLine.findMany({
            where: { refund: { businessId, updatedAt: { gt: sinceDate } } },
            take,
          })
        : [],
      hasPermission(role, Permission.SALE_READ)
        ? prisma.cashierShift.findMany({
            where: { ...w, openedAt: { gt: sinceDate } },
            orderBy: { openedAt: "desc" },
            take,
          })
        : [],
      hasPermission(role, Permission.SALE_READ)
        ? prisma.splitPayment.findMany({
            where: { ...w, createdAt: { gt: sinceDate } },
            take,
          })
        : [],
      canReadEmployees
        ? prisma.employee.findMany({
            where: { ...w, updatedAt: { gt: sinceDate } },
            take,
          })
        : [],
      canReadInvitations
        ? prisma.invitation.findMany({
            where: { ...w, expiresAt: { gt: new Date() }, createdAt: { gt: sinceDate } },
            select: {
              id: true,
              email: true,
              role: true,
              expiresAt: true,
              acceptedAt: true,
              acceptedBy: true,
              createdAt: true,
              businessId: true,
              invitedById: true,
            },
            take,
          })
        : [],
    ]);

    return NextResponse.json({
      lastSync: new Date().toISOString(),
      business,
      products,
      categories,
      sales,
      saleItems,
      accounts,
      journalEntries,
      journalLines,
      customers,
      invoices,
      invoiceLines,
      paymentAllocations,
      suppliers,
      purchaseOrders,
      purchaseOrderLines,
      supplierInvoices,
      stockAdjustments,
      stockAdjustmentLines,
      refunds,
      refundLines,
      cashierShifts,
      splitPayments,
      employees,
      invitations,
    });
  } catch (err) {
    return toAuthError(err);
  }
}
