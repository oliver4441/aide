#!/usr/bin/env npx tsx
/**
 * AIDE-04: Decimal Backfill Script
 *
 * Phase 1: Backfill shadow Decimal columns from Float columns
 * Run after migration SQL adds the _d columns
 *
 * Uses raw SQL via Prisma.$queryRaw to access shadow columns
 * that don't exist in the Prisma schema yet.
 *
 * Usage: npx tsx scripts/decimal-backfill.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

async function backfillProducts() {
  console.log('Backfilling Product prices...');
  const result = await prisma.$executeRaw`
    UPDATE "Product" SET
      "buyingPrice_d" = ROUND("buyingPrice"::numeric, 4),
      "sellingPrice_d" = ROUND("sellingPrice"::numeric, 4)
    WHERE "buyingPrice_d" IS NULL OR "sellingPrice_d" IS NULL
  `;
  console.log(`  Updated ${result} products`);
  return result;
}

async function backfillSales() {
  console.log('Backfilling Sale amounts...');
  const result = await prisma.$executeRaw`
    UPDATE "Sale" SET
      "total_d" = ROUND("total"::numeric, 4),
      "cost_d" = ROUND("cost"::numeric, 4),
      "profit_d" = ROUND("profit"::numeric, 4),
      "paid_d" = ROUND("paid"::numeric, 4),
      "change_d" = ROUND("change"::numeric, 4),
      "tax_d" = ROUND("tax"::numeric, 4),
      "taxRate_d" = ROUND("taxRate"::numeric, 4)
    WHERE "total_d" IS NULL
  `;
  console.log(`  Updated ${result} sales`);
  return result;
}

async function backfillSaleItems() {
  console.log('Backfilling SaleItem prices...');
  const result = await prisma.$executeRaw`
    UPDATE "SaleItem" SET
      "price_d" = ROUND("price"::numeric, 4),
      "cost_d" = ROUND("cost"::numeric, 4)
    WHERE "price_d" IS NULL
  `;
  console.log(`  Updated ${result} sale items`);
  return result;
}

async function backfillBusinesses() {
  console.log('Backfilling Business taxRate...');
  const result = await prisma.$executeRaw`
    UPDATE "Business" SET
      "taxRate_d" = ROUND("taxRate"::numeric, 4)
    WHERE "taxRate_d" IS NULL
  `;
  console.log(`  Updated ${result} businesses`);
  return result;
}

async function verify() {
  console.log('\n=== VERIFICATION ===');

  const productMismatch = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "Product"
    WHERE "buyingPrice_d" != ROUND("buyingPrice"::numeric, 4)
       OR "sellingPrice_d" != ROUND("sellingPrice"::numeric, 4)
  `;
  console.log(`Product mismatches: ${productMismatch[0].count}`);

  const saleMismatch = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "Sale"
    WHERE "total_d" != ROUND("total"::numeric, 4)
       OR "cost_d" != ROUND("cost"::numeric, 4)
       OR "profit_d" != ROUND("profit"::numeric, 4)
       OR "paid_d" != ROUND("paid"::numeric, 4)
       OR "change_d" != ROUND("change"::numeric, 4)
       OR "tax_d" != ROUND("tax"::numeric, 4)
       OR "taxRate_d" != ROUND("taxRate"::numeric, 4)
  `;
  console.log(`Sale mismatches: ${saleMismatch[0].count}`);

  const itemMismatch = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "SaleItem"
    WHERE "price_d" != ROUND("price"::numeric, 4)
       OR "cost_d" != ROUND("cost"::numeric, 4)
  `;
  console.log(`SaleItem mismatches: ${itemMismatch[0].count}`);

  const bizMismatch = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "Business"
    WHERE "taxRate_d" != ROUND("taxRate"::numeric, 4)
  `;
  console.log(`Business mismatches: ${bizMismatch[0].count}`);

  const totalMismatches =
    Number(productMismatch[0].count) +
    Number(saleMismatch[0].count) +
    Number(itemMismatch[0].count) +
    Number(bizMismatch[0].count);

  if (totalMismatches === 0) {
    console.log('\n✅ All backfills verified — zero mismatches');
  } else {
    console.log(`\n⚠️  ${totalMismatches} mismatches found — investigate before cutover`);
  }

  return totalMismatches === 0;
}

async function main() {
  console.log('Starting AIDE-04 Decimal Backfill\n');

  await backfillProducts();
  await backfillSales();
  await backfillSaleItems();
  await backfillBusinesses();

  const ok = await verify();

  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error('Backfill failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});