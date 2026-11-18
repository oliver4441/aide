-- AIDE-04: Phase 2 Cutover — Drop Float columns, rename Decimal columns
-- Verification passed: zero mismatches across all 12 monetary columns
-- Database state: 35 products, 7 sales, 7 sale items, 8 businesses

-- ============================================================================
-- 1. DROP original Float columns
-- ============================================================================
ALTER TABLE "Product" DROP COLUMN "buyingPrice", DROP COLUMN "sellingPrice";
ALTER TABLE "Sale" DROP COLUMN "total", DROP COLUMN "cost", DROP COLUMN "profit", DROP COLUMN "paid", DROP COLUMN "change", DROP COLUMN "tax", DROP COLUMN "taxRate";
ALTER TABLE "SaleItem" DROP COLUMN "price", DROP COLUMN "cost";
ALTER TABLE "Business" DROP COLUMN "taxRate";

-- ============================================================================
-- 2. RENAME Decimal shadow columns to original names
-- ============================================================================
ALTER TABLE "Product" RENAME COLUMN "buyingPrice_d" TO "buyingPrice";
ALTER TABLE "Product" RENAME COLUMN "sellingPrice_d" TO "sellingPrice";
ALTER TABLE "Sale" RENAME COLUMN "total_d" TO "total";
ALTER TABLE "Sale" RENAME COLUMN "cost_d" TO "cost";
ALTER TABLE "Sale" RENAME COLUMN "profit_d" TO "profit";
ALTER TABLE "Sale" RENAME COLUMN "paid_d" TO "paid";
ALTER TABLE "Sale" RENAME COLUMN "change_d" TO "change";
ALTER TABLE "Sale" RENAME COLUMN "tax_d" TO "tax";
ALTER TABLE "Sale" RENAME COLUMN "taxRate_d" TO "taxRate";
ALTER TABLE "SaleItem" RENAME COLUMN "price_d" TO "price";
ALTER TABLE "SaleItem" RENAME COLUMN "cost_d" TO "cost";
ALTER TABLE "Business" RENAME COLUMN "taxRate_d" TO "taxRate";

-- ============================================================================
-- 3. RECREATE indexes on renamed columns (drop old _d indexes first)
-- ============================================================================
DROP INDEX IF EXISTS "Product_buyingPrice_d_idx";
DROP INDEX IF EXISTS "Product_sellingPrice_d_idx";
DROP INDEX IF EXISTS "Sale_total_d_idx";
DROP INDEX IF EXISTS "Sale_cost_d_idx";
DROP INDEX IF EXISTS "SaleItem_price_d_idx";
DROP INDEX IF EXISTS "SaleItem_cost_d_idx";

CREATE INDEX IF NOT EXISTS "Product_buyingPrice_idx" ON "Product" ("buyingPrice");
CREATE INDEX IF NOT EXISTS "Product_sellingPrice_idx" ON "Product" ("sellingPrice");
CREATE INDEX IF NOT EXISTS "Sale_total_idx" ON "Sale" ("total");
CREATE INDEX IF NOT EXISTS "Sale_cost_idx" ON "Sale" ("cost");
CREATE INDEX IF NOT EXISTS "SaleItem_price_idx" ON "SaleItem" ("price");
CREATE INDEX IF NOT EXISTS "SaleItem_cost_idx" ON "SaleItem" ("cost");
