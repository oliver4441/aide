-- AIDE-04: Float → Decimal Migration (Dual-Column Strategy)
-- Phase 1: Add shadow Decimal columns (non-blocking, zero-downtime)
-- Target precision: DECIMAL(19,4) — supports up to 999 trillion with 4 decimal places

-- ============================================================================
-- PRODUCT TABLE
-- ============================================================================
ALTER TABLE "Product" ADD COLUMN "buyingPrice_d" DECIMAL(19,4);
ALTER TABLE "Product" ADD COLUMN "sellingPrice_d" DECIMAL(19,4);

-- ============================================================================
-- SALE TABLE
-- ============================================================================
ALTER TABLE "Sale" ADD COLUMN "total_d" DECIMAL(19,4);
ALTER TABLE "Sale" ADD COLUMN "cost_d" DECIMAL(19,4);
ALTER TABLE "Sale" ADD COLUMN "profit_d" DECIMAL(19,4);
ALTER TABLE "Sale" ADD COLUMN "paid_d" DECIMAL(19,4);
ALTER TABLE "Sale" ADD COLUMN "change_d" DECIMAL(19,4);
ALTER TABLE "Sale" ADD COLUMN "tax_d" DECIMAL(19,4);
ALTER TABLE "Sale" ADD COLUMN "taxRate_d" DECIMAL(19,4);

-- ============================================================================
-- SALE_ITEM TABLE
-- ============================================================================
ALTER TABLE "SaleItem" ADD COLUMN "price_d" DECIMAL(19,4);
ALTER TABLE "SaleItem" ADD COLUMN "cost_d" DECIMAL(19,4);

-- ============================================================================
-- BUSINESS TABLE (taxRate)
-- ============================================================================
ALTER TABLE "Business" ADD COLUMN "taxRate_d" DECIMAL(19,4);

-- ============================================================================
-- INDEXES for query performance on Decimal columns
-- ============================================================================
CREATE INDEX IF NOT EXISTS "Product_buyingPrice_d_idx" ON "Product" ("buyingPrice_d");
CREATE INDEX IF NOT EXISTS "Product_sellingPrice_d_idx" ON "Product" ("sellingPrice_d");
CREATE INDEX IF NOT EXISTS "Sale_total_d_idx" ON "Sale" ("total_d");
CREATE INDEX IF NOT EXISTS "Sale_cost_d_idx" ON "Sale" ("cost_d");
CREATE INDEX IF NOT EXISTS "SaleItem_price_d_idx" ON "SaleItem" ("price_d");
CREATE INDEX IF NOT EXISTS "SaleItem_cost_d_idx" ON "SaleItem" ("cost_d");

-- ============================================================================
-- BACKFILL: Copy Float → Decimal with explicit rounding to 4 decimal places
-- Run during maintenance window; verify before cutover
-- ============================================================================

-- Product backfill
UPDATE "Product" SET
  "buyingPrice_d" = ROUND("buyingPrice"::numeric, 4),
  "sellingPrice_d" = ROUND("sellingPrice"::numeric, 4)
WHERE "buyingPrice_d" IS NULL OR "sellingPrice_d" IS NULL;

-- Sale backfill
UPDATE "Sale" SET
  "total_d" = ROUND("total"::numeric, 4),
  "cost_d" = ROUND("cost"::numeric, 4),
  "profit_d" = ROUND("profit"::numeric, 4),
  "paid_d" = ROUND("paid"::numeric, 4),
  "change_d" = ROUND("change"::numeric, 4),
  "tax_d" = ROUND("tax"::numeric, 4),
  "taxRate_d" = ROUND("taxRate"::numeric, 4)
WHERE "total_d" IS NULL;

-- SaleItem backfill
UPDATE "SaleItem" SET
  "price_d" = ROUND("price"::numeric, 4),
  "cost_d" = ROUND("cost"::numeric, 4)
WHERE "price_d" IS NULL;

-- Business backfill
UPDATE "Business" SET
  "taxRate_d" = ROUND("taxRate"::numeric, 4)
WHERE "taxRate_d" IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES (run after backfill, before cutover)
-- ============================================================================
-- These should return 0 rows if backfill is perfect
-- SELECT 'Product buyingPrice mismatch' AS check, COUNT(*) FROM "Product" WHERE "buyingPrice_d" != ROUND("buyingPrice"::numeric, 4);
-- SELECT 'Product sellingPrice mismatch' AS check, COUNT(*) FROM "Product" WHERE "sellingPrice_d" != ROUND("sellingPrice"::numeric, 4);
-- SELECT 'Sale total mismatch' AS check, COUNT(*) FROM "Sale" WHERE "total_d" != ROUND("total"::numeric, 4);
-- SELECT 'Sale cost mismatch' AS check, COUNT(*) FROM "Sale" WHERE "cost_d" != ROUND("cost"::numeric, 4);
-- SELECT 'Sale profit mismatch' AS check, COUNT(*) FROM "Sale" WHERE "profit_d" != ROUND("profit"::numeric, 4);
-- SELECT 'Sale paid mismatch' AS check, COUNT(*) FROM "Sale" WHERE "paid_d" != ROUND("paid"::numeric, 4);
-- SELECT 'Sale change mismatch' AS check, COUNT(*) FROM "Sale" WHERE "change_d" != ROUND("change"::numeric, 4);
-- SELECT 'Sale tax mismatch' AS check, COUNT(*) FROM "Sale" WHERE "tax_d" != ROUND("tax"::numeric, 4);
-- SELECT 'Sale taxRate mismatch' AS check, COUNT(*) FROM "Sale" WHERE "taxRate_d" != ROUND("taxRate"::numeric, 4);
-- SELECT 'SaleItem price mismatch' AS check, COUNT(*) FROM "SaleItem" WHERE "price_d" != ROUND("price"::numeric, 4);
-- SELECT 'SaleItem cost mismatch' AS check, COUNT(*) FROM "SaleItem" WHERE "cost_d" != ROUND("cost"::numeric, 4);
-- SELECT 'Business taxRate mismatch' AS check, COUNT(*) FROM "Business" WHERE "taxRate_d" != ROUND("taxRate"::numeric, 4);

-- ============================================================================
-- PHASE 2: CUTOVER (run after validation period, single deploy)
-- ============================================================================
-- Uncomment and run after dual-write validation period (minimum 2 weeks)
--
-- -- 1. Drop Float columns
-- ALTER TABLE "Product" DROP COLUMN "buyingPrice", DROP COLUMN "sellingPrice";
-- ALTER TABLE "Sale" DROP COLUMN "total", DROP COLUMN "cost", DROP COLUMN "profit", DROP COLUMN "paid", DROP COLUMN "change", DROP COLUMN "tax", DROP COLUMN "taxRate";
-- ALTER TABLE "SaleItem" DROP COLUMN "price", DROP COLUMN "cost";
-- ALTER TABLE "Business" DROP COLUMN "taxRate";
--
-- -- 2. Rename Decimal columns to original names
-- ALTER TABLE "Product" RENAME COLUMN "buyingPrice_d" TO "buyingPrice";
-- ALTER TABLE "Product" RENAME COLUMN "sellingPrice_d" TO "sellingPrice";
-- ALTER TABLE "Sale" RENAME COLUMN "total_d" TO "total";
-- ALTER TABLE "Sale" RENAME COLUMN "cost_d" TO "cost";
-- ALTER TABLE "Sale" RENAME COLUMN "profit_d" TO "profit";
-- ALTER TABLE "Sale" RENAME COLUMN "paid_d" TO "paid";
-- ALTER TABLE "Sale" RENAME COLUMN "change_d" TO "change";
-- ALTER TABLE "Sale" RENAME COLUMN "tax_d" TO "tax";
-- ALTER TABLE "Sale" RENAME COLUMN "taxRate_d" TO "taxRate";
-- ALTER TABLE "SaleItem" RENAME COLUMN "price_d" TO "price";
-- ALTER TABLE "SaleItem" RENAME COLUMN "cost_d" TO "cost";
-- ALTER TABLE "Business" RENAME COLUMN "taxRate_d" TO "taxRate";
--
-- -- 3. Recreate indexes on renamed columns
-- DROP INDEX IF EXISTS "Product_buyingPrice_d_idx";
-- DROP INDEX IF EXISTS "Product_sellingPrice_d_idx";
-- DROP INDEX IF EXISTS "Sale_total_d_idx";
-- DROP INDEX IF EXISTS "Sale_cost_d_idx";
-- DROP INDEX IF EXISTS "SaleItem_price_d_idx";
-- DROP INDEX IF EXISTS "SaleItem_cost_d_idx";
-- CREATE INDEX IF NOT EXISTS "Product_buyingPrice_idx" ON "Product" ("buyingPrice");
-- CREATE INDEX IF NOT EXISTS "Product_sellingPrice_idx" ON "Product" ("sellingPrice");
-- CREATE INDEX IF NOT EXISTS "Sale_total_idx" ON "Sale" ("total");
-- CREATE INDEX IF NOT EXISTS "Sale_cost_idx" ON "Sale" ("cost");
-- CREATE INDEX IF NOT EXISTS "SaleItem_price_idx" ON "SaleItem" ("price");
-- CREATE INDEX IF NOT EXISTS "SaleItem_cost_idx" ON "SaleItem" ("cost");

-- ============================================================================
-- ROLLBACK (if needed during dual-write phase)
-- ============================================================================
-- ALTER TABLE "Product" DROP COLUMN IF EXISTS "buyingPrice_d", DROP COLUMN IF EXISTS "sellingPrice_d";
-- ALTER TABLE "Sale" DROP COLUMN IF EXISTS "total_d", DROP COLUMN IF EXISTS "cost_d", DROP COLUMN IF EXISTS "profit_d", DROP COLUMN IF EXISTS "paid_d", DROP COLUMN IF EXISTS "change_d", DROP COLUMN IF EXISTS "tax_d", DROP COLUMN IF EXISTS "taxRate_d";
-- ALTER TABLE "SaleItem" DROP COLUMN IF EXISTS "price_d", DROP COLUMN IF EXISTS "cost_d";
-- ALTER TABLE "Business" DROP COLUMN IF EXISTS "taxRate_d";
-- DROP INDEX IF EXISTS "Product_buyingPrice_d_idx";
-- DROP INDEX IF EXISTS "Product_sellingPrice_d_idx";
-- DROP INDEX IF EXISTS "Sale_total_d_idx";
-- DROP INDEX IF EXISTS "Sale_cost_d_idx";
-- DROP INDEX IF EXISTS "SaleItem_price_d_idx";
-- DROP INDEX IF EXISTS "SaleItem_cost_d_idx";