/**
 * AIDE-22: Data import — server-side analysis and persistence.
 *
 * Shared by /api/imports/validate, /api/imports/commit, /api/imports and
 * /api/imports/[id]/rollback. All analysis is exact-decimal string math via
 * src/lib/importEngine.mjs; every query is scoped by businessId (tenant
 * isolation is non-negotiable).
 */
import { prisma } from "@/lib/prisma";
import {
  buildDryRun,
  isImportEntity,
  planRow,
  IMPORT_LIMITS,
} from "@/lib/importEngine.mjs";
import { ForbiddenError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

export const IMPORT_BRIDGE_VERSION = 1;
export const MAX_BODY_BYTES = 8 * 1024 * 1024; // rough cap; rows are also capped

export function isDuplicateStrategy(value: unknown): value is "skip" | "merge" {
  return value === "skip" || value === "merge";
}

/**
 * Lightweight index of existing rows for a business, used to detect
 * duplicates against the database (products: SKU then name; customers:
 * customer code, then phone, then email, then name).
 */
async function fetchDbIndex(businessId: string, entity: string) {
  if (entity === "products") {
    const products = await prisma.product.findMany({
      where: { businessId },
      select: { id: true, sku: true, name: true },
    });
    const byKey = new Map<string, { id: string }>();
    for (const p of products) {
      if (p.sku) {
        const k = `sku:${String(p.sku).trim().toLowerCase().replace(/\s+/g, "")}`;
        if (!byKey.has(k)) byKey.set(k, { id: p.id });
      }
      if (p.name) {
        const k = `name:${String(p.name).trim().toLowerCase()}`;
        if (!byKey.has(k)) byKey.set(k, { id: p.id });
      }
    }
    return byKey;
  }
  const customers = await prisma.customer.findMany({
    where: { businessId },
    select: { id: true, customerCode: true, phone: true, email: true, name: true },
  });
  const byKey = new Map<string, { id: string }>();
  for (const c of customers) {
    const keys: string[] = [];
    if (c.customerCode) keys.push(`code:${String(c.customerCode).trim().toLowerCase()}`);
    if (c.phone) {
      const digits = String(c.phone).replace(/[^\d]/g, "");
      if (digits) keys.push(`phone:${digits}`);
    }
    if (c.email) keys.push(`email:${String(c.email).trim().toLowerCase()}`);
    if (c.name) keys.push(`name:${String(c.name).trim().toLowerCase()}`);
    for (const k of keys) {
      if (!byKey.has(k)) byKey.set(k, { id: c.id });
    }
  }
  return byKey;
}

export interface AnalyzeArgs {
  entity: string;
  headers: unknown;
  rows: unknown;
  mapping: unknown;
}

/**
 * Run the dry-run analysis: structural validation (importEngine) plus
 * duplicate detection against the database. No writes happen here.
 */
export async function analyzeImport(businessId: string, args: AnalyzeArgs) {
  const { entity, headers, rows, mapping } = args;
  if (!isImportEntity(entity)) {
    return { ok: false as const, error: `Unsupported import entity "${entity}"` };
  }
  const mapped: Record<string, number | null> = {};
  if (mapping && typeof mapping === "object" && !Array.isArray(mapping)) {
    for (const [k, v] of Object.entries(mapping as Record<string, unknown>)) {
      if (v === null || v === undefined) continue;
      const idx = Number(v);
      if (Number.isInteger(idx) && idx >= 0) mapped[k] = idx;
    }
  } else {
    return { ok: false as const, error: "Column mapping is missing" };
  }

  if (!Array.isArray(headers) || headers.some((h) => h !== null && typeof h !== "string" && typeof h !== "number")) {
    return { ok: false as const, error: "Headers must be an array of strings" };
  }
  const cleanHeaders = (headers as unknown[]).map((h) => String(h ?? ""));
  if (cleanHeaders.length > 200) return { ok: false as const, error: "Too many columns (max 200)" };
  if (!Array.isArray(rows)) {
    return { ok: false as const, error: "Rows must be an array" };
  }
  const cleanRows = rows as unknown[][];

  const dbEntity = entity as "products" | "customers";

  const dry: any = buildDryRun({
    entity: dbEntity,
    headers: cleanHeaders,
    rows: cleanRows,
    mapping: mapped,
  });
  if (!dry.ok) return dry;

  // Attach database duplicates to rows that are otherwise valid.
  const dbIndex = await fetchDbIndex(businessId, entity);
  let dbDupes = 0;
  let validCount = dry.validCount;
  const outRows = dry.rows.map((row: any) => {
    if (row.status !== "ok" || !row.dedupeKey) return row;
    const hit = dbIndex.get(row.dedupeKey);
    if (!hit) return row;
    dbDupes++;
    validCount--;
    return { ...row, status: "duplicate", existingId: hit.id, duplicateOf: "existing record" };
  });

  return {
    ...dry,
    rows: outRows,
    validCount,
    duplicateCount: dry.duplicateCount + dbDupes,
    errorReport: outRows
      .filter((r: any) => r.status === "error")
      .map((r: any) => ({ row: r.row, errors: r.errors })),
  };
}

export interface CommitArgs extends AnalyzeArgs {
  fileName?: unknown;
  duplicateStrategy?: unknown;
}

interface ProductRowData {
  name: string;
  sku: string | null;
  buyingPrice: string;
  sellingPrice: string | null;
  quantity: number | null;
  lowStock: number | null;
  category: string | null;
  isService: boolean | null;
}

interface CustomerRowData {
  name: string;
  customerCode: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  creditLimit: string | null;
}

function normalizeCategoryName(name: string) {
  return name.trim().toLowerCase();
}

/**
 * JSON-safe copy of a Prisma value for storage in Json columns.
 * Prisma Decimals/Dates are objects — stringify-roundtrip turns them into
 * canonical strings (e.g. Decimal(19,4) → "12.3450").
 */
function jsonSafe(value: unknown): unknown {
  if (value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

const SAVEPOINT = "aide_import_sp";

/**
 * Run `fn` inside a SQL SAVEPOINT so a failing statement does not poison the
 * surrounding transaction (PostgreSQL aborts the whole transaction on any
 * error otherwise). Rethrows after rolling back to the savepoint.
 */
async function withSavepoint(tx: any, fn: () => Promise<void>): Promise<void> {
  await tx.$executeRawUnsafe(`SAVEPOINT ${SAVEPOINT}`);
  try {
    await fn();
    await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${SAVEPOINT}`);
  } catch (err) {
    await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${SAVEPOINT}`).catch(() => undefined);
    throw err;
  }
}

/**
 * Commit an import inside a single transaction. Row-level failures are
 * collected (never thrown) so one bad row cannot abort the batch; the whole
 * thing still rolls back atomically on unexpected errors.
 */
export async function commitImport(
  businessId: string,
  userId: string,
  args: CommitArgs
) {
  const strategy = args.duplicateStrategy === "merge" ? "merge" : "skip";
  const analysis = await analyzeImport(businessId, args);
  if (!analysis.ok) {
    return { ok: false as const, status: 400, error: analysis.error };
  }
  const fileName =
    typeof args.fileName === "string" && args.fileName.trim()
      ? args.fileName.trim().slice(0, 255)
      : "import";

  const mappingForRecord: Record<string, number | null> = {};
  for (const [k, v] of Object.entries((args.mapping ?? {}) as Record<string, unknown>)) {
    mappingForRecord[k] = v === null || v === undefined ? null : Number(v);
  }

  const result = await prisma.$transaction(
    async (tx: any) => {
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      const createdProductIds: string[] = [];
      const createdCustomerIds: string[] = [];
      const createdCategoryIds: string[] = [];
      const updatedSnapshot: Array<{ id: string; entity: string; prior: Record<string, unknown> }> = [];
      const errorReport: Array<{ row: number; errors: string[] }> = [];

      // Category cache for product imports (normalized name → category id).
      let categoryCache: Map<string, string> | null = null;
      const categoryFor = async (rawName: string): Promise<string | null> => {
        const cleaned = String(rawName ?? "").trim();
        if (!cleaned) return null;
        if (!categoryCache) {
          const existing = await tx.category.findMany({
            where: { businessId },
            select: { id: true, name: true },
          });
          categoryCache = new Map<string, string>(
            existing.map((c: { id: string; name: string }) => [normalizeCategoryName(c.name), c.id])
          );
        }
        const key = normalizeCategoryName(cleaned);
        const hit = categoryCache.get(key);
        if (hit) return hit;
        const created = await tx.category.create({
          data: { name: cleaned.slice(0, 100), businessId },
          select: { id: true },
        });
        categoryCache.set(key, created.id);
        createdCategoryIds.push(created.id);
        return created.id;
      };

      // Next customer code (CUST-###) — fetched once, incremented in memory.
      let nextCustomerSeq: number | null = null;
      const nextCustomerCode = async (): Promise<string> => {
        if (nextCustomerSeq === null) {
          const latest = await tx.customer.findFirst({
            where: { businessId, customerCode: { startsWith: "CUST-" } },
            orderBy: { customerCode: "desc" },
            select: { customerCode: true },
          });
          const match = latest?.customerCode?.match(/CUST-(\d+)/);
          nextCustomerSeq = match ? parseInt(match[1], 10) + 1 : 1;
        }
        const code = `CUST-${String(nextCustomerSeq).padStart(3, "0")}`;
        nextCustomerSeq += 1;
        return code;
      };

      for (const row of analysis.rows as any[]) {
        const plan = planRow(row, { strategy });
        const createdCategoriesBefore = createdCategoryIds.length;
        try {
          await withSavepoint(tx, async () => {
          if (plan.action === "skip-empty") {
            skippedCount++;
            return;
          }
          if (plan.action === "fail") {
            failedCount++;
            errorReport.push({ row: row.row, errors: plan.errors ?? row.errors });
            return;
          }
          if (plan.action === "skip-duplicate") {
            skippedCount++;
            return;
          }

          if (analysis.entity === "products") {
            const data = row.data as ProductRowData;
            if (plan.action === "update" && plan.existingId) {
              const existing = await tx.product.findFirst({
                where: { id: plan.existingId, businessId },
              });
              if (!existing) {
                failedCount++;
                errorReport.push({ row: row.row, errors: ["Matched product no longer exists"] });
                return;
              }
              const prior: Record<string, unknown> = {};
              const updateData: Record<string, unknown> = {};
              const provided = new Set(row.provided ?? []);
              for (const key of ["name", "sku", "buyingPrice", "sellingPrice", "quantity", "lowStock", "isService"] as const) {
                if (!provided.has(key)) continue;
                const value = (data as any)[key];
                if (value === null || value === undefined) continue;
                prior[key] = jsonSafe((existing as any)[key]);
                updateData[key] = value;
              }
              if (provided.has("category") && data.category) {
                const catId = await categoryFor(data.category);
                if (catId) {
                  prior["categoryId"] = existing.categoryId;
                  updateData["categoryId"] = catId;
                }
              }
              if (Object.keys(updateData).length === 0) {
                skippedCount++;
                return;
              }
              const res = await tx.product.updateMany({
                where: { id: plan.existingId, businessId },
                data: updateData,
              });
              if (res.count === 0) {
                failedCount++;
                errorReport.push({ row: row.row, errors: ["Could not update matched product"] });
                return;
              }
              updatedSnapshot.push({ id: plan.existingId, entity: "PRODUCTS", prior });
              updatedCount++;
            } else {
              // create
              const categoryId = data.category ? await categoryFor(data.category) : null;
              const created = await tx.product.create({
                data: {
                  businessId,
                  name: data.name,
                  sku: data.sku ?? null,
                  buyingPrice: data.buyingPrice ?? "0.0000",
                  sellingPrice: data.sellingPrice ?? "0.0000",
                  quantity: data.quantity ?? 0,
                  lowStock: data.lowStock ?? 5,
                  isService: data.isService ?? false,
                  categoryId,
                },
                select: { id: true },
              });
              createdProductIds.push(created.id);
              createdCount++;
            }
          } else {
            // customers
            const data = row.data as CustomerRowData;
            if (plan.action === "update" && plan.existingId) {
              const existing = await tx.customer.findFirst({
                where: { id: plan.existingId, businessId },
              });
              if (!existing) {
                failedCount++;
                errorReport.push({ row: row.row, errors: ["Matched customer no longer exists"] });
                return;
              }
              const prior: Record<string, unknown> = {};
              const updateData: Record<string, unknown> = {};
              const provided = new Set(row.provided ?? []);
              for (const key of ["name", "email", "phone", "address", "city", "notes", "creditLimit"] as const) {
                if (!provided.has(key)) continue;
                const value = (data as any)[key];
                if (value === null || value === undefined) continue;
                prior[key] = jsonSafe((existing as any)[key]);
                updateData[key] = value;
              }
              if (Object.keys(updateData).length === 0) {
                skippedCount++;
                return;
              }
              const res = await tx.customer.updateMany({
                where: { id: plan.existingId, businessId },
                data: updateData,
              });
              if (res.count === 0) {
                failedCount++;
                errorReport.push({ row: row.row, errors: ["Could not update matched customer"] });
                return;
              }
              updatedSnapshot.push({ id: plan.existingId, entity: "CUSTOMERS", prior });
              updatedCount++;
            } else {
              // create — customer code from file, else next CUST-### in sequence
              let customerCode = data.customerCode?.trim() || null;
              if (!customerCode) customerCode = await nextCustomerCode();
              const created = await tx.customer.create({
                data: {
                  businessId,
                  customerCode,
                  name: data.name,
                  email: data.email ?? null,
                  phone: data.phone ?? null,
                  address: data.address ?? null,
                  city: data.city ?? null,
                  notes: data.notes ?? null,
                  creditLimit: data.creditLimit ?? "0.0000",
                },
                select: { id: true },
              });
              createdCustomerIds.push(created.id);
              createdCount++;
            }
          }
          });
        } catch (err: any) {
          failedCount++;
          const message = err?.message ? String(err.message).slice(0, 300) : "Unexpected error";
          errorReport.push({ row: row.row, errors: [message] });
          // Categories created inside the rolled-back savepoint vanished from
          // the database — drop them from the cache and the rollback ledger
          // so later rows recreate them instead of linking to a stale id.
          const stale = createdCategoryIds.splice(createdCategoriesBefore);
          if (stale.length) {
            const staleSet = new Set(stale);
            const cache = categoryCache as unknown as Map<string, string> | null;
            if (cache) {
              cache.forEach((value: string, key: string) => {
                if (staleSet.has(value)) cache.delete(key);
              });
            }
          }
        }
      }

      const batch = await tx.importBatch.create({
        data: {
          businessId,
          fileName,
          entity: analysis.entity === "products" ? "PRODUCTS" : "CUSTOMERS",
          status: "COMPLETED",
          duplicateStrategy: strategy === "merge" ? "MERGE" : "SKIP",
          mapping: mappingForRecord,
          totalRows: analysis.totalRows,
          createdCount,
          updatedCount,
          skippedCount,
          failedCount,
          createdIds: {
            products: createdProductIds,
            customers: createdCustomerIds,
            categoryIds: createdCategoryIds,
          },
          updatedSnapshot,
          errorReport: errorReport.slice(0, 100),
          createdById: userId,
        },
      });
      return { batch, createdCount, updatedCount, skippedCount, failedCount, errorReport };
    },
    { timeout: 30000, maxWait: 10000 }
  );

  return {
    ok: true as const,
    batchId: result.batch.id,
    entity: analysis.entity,
    fileName,
    totalRows: analysis.totalRows,
    createdCount: result.createdCount,
    updatedCount: result.updatedCount,
    skippedCount: result.skippedCount,
    failedCount: result.failedCount,
    errorReport: result.errorReport.slice(0, IMPORT_LIMITS.errorSampleSize),
  };
}

/**
 * Roll back a committed batch: delete records this batch created (blocked
 * records — e.g. referenced by sales — are reported, not force-deleted) and
 * restore the prior values of rows that were merged.
 */
export async function rollbackImport(businessId: string, batchId: string) {
  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, businessId },
  });
  if (!batch) {
    return { ok: false as const, status: 404, error: "Import batch not found" };
  }
  if (batch.status === "ROLLED_BACK") {
    return { ok: false as const, status: 400, error: "This import has already been rolled back" };
  }

  const created = (batch.createdIds as any) ?? {};
  const snapshot: Array<{ id: string; entity: string; prior: Record<string, unknown> }> =
    Array.isArray(batch.updatedSnapshot) ? (batch.updatedSnapshot as any) : [];
  const productIds: string[] = Array.isArray(created.products) ? created.products : [];
  const customerIds: string[] = Array.isArray(created.customers) ? created.customers : [];
  const categoryIds: string[] = Array.isArray(created.categoryIds) ? created.categoryIds : [];

  const outcome = await prisma.$transaction(
    async (tx: any) => {
      let deletedProducts = 0;
      let deletedCustomers = 0;
      const blocked: Array<{ entity: string; id: string }> = [];
      let restored = 0;

      // Pre-check references so we never issue a doomed DELETE (a failed
      // statement would poison the transaction). Products used in sales or
      // stock adjustments are kept and reported; customers linked to sales,
      // invoices or payment allocations are kept too (their invoices would
      // otherwise cascade away with them — never silently).
      const tryDeleteProduct = async (id: string) => {
        const [saleRefs, adjRefs] = await Promise.all([
          tx.saleItem.count({ where: { productId: id } }),
          tx.stockAdjustmentLine.count({ where: { productId: id } }),
        ]);
        if (saleRefs + adjRefs > 0) {
          blocked.push({ entity: "products", id });
          return;
        }
        await withSavepoint(tx, async () => {
          const res = await tx.product.deleteMany({ where: { id, businessId } });
          if (res.count > 0) deletedProducts += res.count;
          else blocked.push({ entity: "products", id }); // vanished already
        }).catch(() => blocked.push({ entity: "products", id }));
      };

      const tryDeleteCustomer = async (id: string) => {
        const [saleRefs, invoiceRefs, allocationRefs] = await Promise.all([
          tx.sale.count({ where: { customerId: id } }),
          tx.invoice.count({ where: { customerId: id } }),
          tx.paymentAllocation.count({ where: { customerId: id } }),
        ]);
        if (saleRefs + invoiceRefs + allocationRefs > 0) {
          blocked.push({ entity: "customers", id });
          return;
        }
        await withSavepoint(tx, async () => {
          const res = await tx.customer.deleteMany({ where: { id, businessId } });
          if (res.count > 0) deletedCustomers += res.count;
          else blocked.push({ entity: "customers", id });
        }).catch(() => blocked.push({ entity: "customers", id }));
      };

      for (const id of productIds) await tryDeleteProduct(id);
      for (const id of customerIds) await tryDeleteCustomer(id);

      for (const entry of snapshot) {
        const table = entry.entity === "PRODUCTS" ? tx.product : entry.entity === "CUSTOMERS" ? tx.customer : null;
        if (!table) continue;
        await withSavepoint(tx, async () => {
          const res = await table.updateMany({
            where: { id: entry.id, businessId },
            data: entry.prior,
          });
          if (res.count > 0) restored++;
        }).catch(() => blocked.push({ entity: String(entry.entity).toLowerCase(), id: entry.id }));
      }
      // Delete categories this batch created, but only when nothing uses them anymore.
      let deletedCategories = 0;
      for (const id of categoryIds) {
        const inUse = await tx.product.count({ where: { categoryId: id } });
        if (inUse === 0) {
          await withSavepoint(tx, async () => {
            await tx.category.delete({ where: { id } });
            deletedCategories++;
          }).catch(() => undefined);
        }
      }

      await tx.importBatch.update({
        where: { id: batch.id },
        data: { status: "ROLLED_BACK", rolledBackAt: new Date() },
      });

      return {
        deletedProducts,
        deletedCustomers,
        deletedCategories,
        restored,
        blocked,
      };
    },
    { timeout: 30000, maxWait: 10000 }
  );

  return { ok: true as const, ...outcome };
}

// ---------------------------------------------------------------------------
// Authorization helpers
// ---------------------------------------------------------------------------
type ImportMode = "read" | "write" | "delete";

/**
 * Assert the caller's membership role may operate on import data for the
 * given entity. OWNER/MANAGER can import and roll back; STAFF is read-only.
 */
export async function requireImportRole(
  user: { id: string },
  businessId: string,
  entity: string,
  mode: ImportMode
) {
  const membership = await prisma.businessMembership.findUnique({
    where: { userId_businessId: { userId: user.id, businessId } },
    select: { role: true },
  });
  if (!membership) throw new ForbiddenError("No membership in this business");
  const normalized = entity.toLowerCase();
  const permission =
    normalized === "products"
      ? mode === "write"
        ? Permission.PRODUCT_CREATE
        : mode === "delete"
        ? Permission.PRODUCT_DELETE
        : Permission.PRODUCT_READ
      : mode === "write"
      ? Permission.CUSTOMER_CREATE
      : mode === "delete"
      ? Permission.CUSTOMER_DELETE
      : Permission.CUSTOMER_READ;
  if (!hasPermission(membership.role, permission)) {
    throw new ForbiddenError("Your role cannot perform this import action");
  }
  return membership.role;
}
