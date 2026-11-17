#!/usr/bin/env bash
# AIDE-04: Local SQLite migration test harness.
#
# Simulates the Room MIGRATION_5_6 (decimal REAL -> INTEGER, scaled x10000) on a
# real SQLite database — no Android SDK / Gradle needed. Exercises the exact SQL
# blocks from AideDatabase.kt and validates data integrity end to end.
set -euo pipefail

DB="$(mktemp /tmp/aide_migration_test.XXXXXX.db)"
trap 'rm -f "$DB"' EXIT

migrate() {
  sqlite3 "$DB" <<'SQL'
PRAGMA foreign_keys = OFF;

-- ==================== MIGRATION_5_6: PRODUCTS ====================
ALTER TABLE `products` ADD COLUMN `buyingPrice_scaled` INTEGER;
ALTER TABLE `products` ADD COLUMN `sellingPrice_scaled` INTEGER;
UPDATE `products` SET `buyingPrice_scaled` = ROUND(`buyingPrice` * 10000), `sellingPrice_scaled` = ROUND(`sellingPrice` * 10000);
CREATE TABLE `products_new` (
    `id` TEXT NOT NULL,
    `businessId` TEXT NOT NULL,
    `categoryId` TEXT,
    `name` TEXT NOT NULL,
    `sku` TEXT,
    `buyingPrice` INTEGER NOT NULL,
    `sellingPrice` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `lowStock` INTEGER NOT NULL,
    `isService` INTEGER NOT NULL,
    `imageUrl` TEXT,
    `isActive` INTEGER NOT NULL,
    `createdAt` TEXT NOT NULL,
    `updatedAt` TEXT NOT NULL,
    PRIMARY KEY(`id`)
);
INSERT INTO `products_new` (`id`, `businessId`, `categoryId`, `name`, `sku`, `buyingPrice`, `sellingPrice`, `quantity`, `lowStock`, `isService`, `imageUrl`, `isActive`, `createdAt`, `updatedAt`)
SELECT `id`, `businessId`, `categoryId`, `name`, `sku`, `buyingPrice_scaled`, `sellingPrice_scaled`, `quantity`, `lowStock`, `isService`, `imageUrl`, `isActive`, `createdAt`, `updatedAt` FROM `products`;
DROP TABLE `products`;
ALTER TABLE `products_new` RENAME TO `products`;

-- ==================== MIGRATION_5_6: SALES ====================
ALTER TABLE `sales` ADD COLUMN `total_scaled` INTEGER;
ALTER TABLE `sales` ADD COLUMN `cost_scaled` INTEGER;
ALTER TABLE `sales` ADD COLUMN `profit_scaled` INTEGER;
ALTER TABLE `sales` ADD COLUMN `paid_scaled` INTEGER;
ALTER TABLE `sales` ADD COLUMN `change_scaled` INTEGER;
ALTER TABLE `sales` ADD COLUMN `tax_scaled` INTEGER;
ALTER TABLE `sales` ADD COLUMN `taxRate_scaled` INTEGER;
UPDATE `sales` SET
    `total_scaled` = ROUND(`total` * 10000),
    `cost_scaled` = ROUND(`cost` * 10000),
    `profit_scaled` = ROUND(`profit` * 10000),
    `paid_scaled` = ROUND(`paid` * 10000),
    `change_scaled` = ROUND(`change` * 10000),
    `tax_scaled` = ROUND(`tax` * 10000),
    `taxRate_scaled` = ROUND(`taxRate` * 10000);
CREATE TABLE `sales_new` (
    `id` TEXT NOT NULL,
    `businessId` TEXT NOT NULL,
    `total` INTEGER NOT NULL,
    `cost` INTEGER NOT NULL,
    `profit` INTEGER NOT NULL,
    `paid` INTEGER NOT NULL,
    `change` INTEGER NOT NULL,
    `tax` INTEGER NOT NULL,
    `taxRate` INTEGER NOT NULL,
    `cashier` TEXT,
    `paymentMethod` TEXT NOT NULL,
    `notes` TEXT,
    `createdAt` TEXT NOT NULL,
    PRIMARY KEY(`id`)
);
INSERT INTO `sales_new` (`id`, `businessId`, `total`, `cost`, `profit`, `paid`, `change`, `tax`, `taxRate`, `cashier`, `paymentMethod`, `notes`, `createdAt`)
SELECT `id`, `businessId`, `total_scaled`, `cost_scaled`, `profit_scaled`, `paid_scaled`, `change_scaled`, `tax_scaled`, `taxRate_scaled`, `cashier`, `paymentMethod`, `notes`, `createdAt` FROM `sales`;
DROP TABLE `sales`;
ALTER TABLE `sales_new` RENAME TO `sales`;

-- ==================== MIGRATION_5_6: SALE_ITEMS ====================
ALTER TABLE `sale_items` ADD COLUMN `price_scaled` INTEGER;
ALTER TABLE `sale_items` ADD COLUMN `cost_scaled` INTEGER;
UPDATE `sale_items` SET `price_scaled` = ROUND(`price` * 10000), `cost_scaled` = ROUND(`cost` * 10000);
CREATE TABLE `sale_items_new` (
    `id` TEXT NOT NULL,
    `saleId` TEXT NOT NULL,
    `productId` TEXT,
    `name` TEXT NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price` INTEGER NOT NULL,
    `cost` INTEGER NOT NULL,
    PRIMARY KEY(`id`)
);
INSERT INTO `sale_items_new` (`id`, `saleId`, `productId`, `name`, `quantity`, `price`, `cost`)
SELECT `id`, `saleId`, `productId`, `name`, `quantity`, `price_scaled`, `cost_scaled` FROM `sale_items`;
DROP TABLE `sale_items`;
ALTER TABLE `sale_items_new` RENAME TO `sale_items`;

-- ==================== MIGRATION_5_6: EXPENSES ====================
ALTER TABLE `expenses` ADD COLUMN `amount_scaled` INTEGER;
UPDATE `expenses` SET `amount_scaled` = ROUND(`amount` * 10000);
CREATE TABLE `expenses_new` (
    `id` TEXT NOT NULL,
    `businessId` TEXT NOT NULL,
    `category` TEXT NOT NULL,
    `description` TEXT,
    `amount` INTEGER NOT NULL,
    `isCogs` INTEGER NOT NULL,
    `notes` TEXT,
    `createdAt` TEXT NOT NULL,
    PRIMARY KEY(`id`)
);
INSERT INTO `expenses_new` (`id`, `businessId`, `category`, `description`, `amount`, `isCogs`, `notes`, `createdAt`)
SELECT `id`, `businessId`, `category`, `description`, `amount_scaled`, `isCogs`, `notes`, `createdAt` FROM `expenses`;
DROP TABLE `expenses`;
ALTER TABLE `expenses_new` RENAME TO `expenses`;
CREATE INDEX IF NOT EXISTS `index_expenses_businessId` ON `expenses` (`businessId`);
CREATE INDEX IF NOT EXISTS `index_expenses_createdAt` ON `expenses` (`createdAt`);

-- ==================== MIGRATION_5_6: CUSTOMERS ====================
ALTER TABLE `customers` ADD COLUMN `balance_scaled` INTEGER;
UPDATE `customers` SET `balance_scaled` = ROUND(`balance` * 10000);
CREATE TABLE `customers_new` (
    `id` TEXT NOT NULL,
    `businessId` TEXT NOT NULL,
    `name` TEXT NOT NULL,
    `phone` TEXT,
    `email` TEXT,
    `notes` TEXT,
    `balance` INTEGER NOT NULL,
    `isActive` INTEGER NOT NULL,
    `createdAt` TEXT NOT NULL,
    `updatedAt` TEXT NOT NULL,
    PRIMARY KEY(`id`)
);
INSERT INTO `customers_new` (`id`, `businessId`, `name`, `phone`, `email`, `notes`, `balance`, `isActive`, `createdAt`, `updatedAt`)
SELECT `id`, `businessId`, `name`, `phone`, `email`, `notes`, `balance_scaled`, `isActive`, `createdAt`, `updatedAt` FROM `customers`;
DROP TABLE `customers`;
ALTER TABLE `customers_new` RENAME TO `customers`;
CREATE INDEX IF NOT EXISTS `index_customers_businessId` ON `customers` (`businessId`);
CREATE INDEX IF NOT EXISTS `index_customers_name` ON `customers` (`name`);

-- ==================== MIGRATION_5_6: BUSINESSES ====================
ALTER TABLE `businesses` ADD COLUMN `taxRate_scaled` INTEGER;
UPDATE `businesses` SET `taxRate_scaled` = ROUND(`taxRate` * 10000);
CREATE TABLE `businesses_new` (
    `id` TEXT NOT NULL,
    `name` TEXT NOT NULL,
    `type` TEXT NOT NULL,
    `slug` TEXT NOT NULL,
    `currency` TEXT NOT NULL,
    `taxRate` INTEGER NOT NULL,
    `receiptFooter` TEXT,
    `logoUrl` TEXT,
    `organizationId` TEXT,
    `locationId` TEXT,
    `createdAt` TEXT NOT NULL,
    `updatedAt` TEXT NOT NULL,
    PRIMARY KEY(`id`)
);
INSERT INTO `businesses_new` (`id`, `name`, `type`, `slug`, `currency`, `taxRate`, `receiptFooter`, `logoUrl`, `organizationId`, `locationId`, `createdAt`, `updatedAt`)
SELECT `id`, `name`, `type`, `slug`, `currency`, `taxRate_scaled`, `receiptFooter`, `logoUrl`, `organizationId`, `locationId`, `createdAt`, `updatedAt` FROM `businesses`;
DROP TABLE `businesses`;
ALTER TABLE `businesses_new` RENAME TO `businesses`;
CREATE INDEX IF NOT EXISTS `index_businesses_organizationId` ON `businesses` (`organizationId`);
CREATE INDEX IF NOT EXISTS `index_businesses_locationId` ON `businesses` (`locationId`);
SQL
}

echo "=== AIDE-04 SQLite migration test ==="
echo ""

# ---- Seed v5 schema (pre-migration state) ----
echo "Seeding v5 schema with realistic data (incl. float precision traps)..."
sqlite3 "$DB" <<'SQL'
CREATE TABLE `businesses` (
    `id` TEXT NOT NULL, `name` TEXT NOT NULL, `type` TEXT NOT NULL, `slug` TEXT NOT NULL,
    `currency` TEXT NOT NULL, `taxRate` REAL NOT NULL, `receiptFooter` TEXT, `logoUrl` TEXT,
    `organizationId` TEXT, `locationId` TEXT, `createdAt` TEXT NOT NULL, `updatedAt` TEXT NOT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `products` (
    `id` TEXT NOT NULL, `businessId` TEXT NOT NULL, `categoryId` TEXT, `name` TEXT NOT NULL,
    `sku` TEXT, `buyingPrice` REAL NOT NULL, `sellingPrice` REAL NOT NULL, `quantity` INTEGER NOT NULL,
    `lowStock` INTEGER NOT NULL, `isService` INTEGER NOT NULL, `imageUrl` TEXT, `isActive` INTEGER NOT NULL,
    `createdAt` TEXT NOT NULL, `updatedAt` TEXT NOT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `sales` (
    `id` TEXT NOT NULL, `businessId` TEXT NOT NULL,
    `total` REAL NOT NULL, `cost` REAL NOT NULL, `profit` REAL NOT NULL,
    `paid` REAL NOT NULL, `change` REAL NOT NULL, `tax` REAL NOT NULL, `taxRate` REAL NOT NULL,
    `cashier` TEXT, `paymentMethod` TEXT NOT NULL, `notes` TEXT, `createdAt` TEXT NOT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `sale_items` (
    `id` TEXT NOT NULL, `saleId` TEXT NOT NULL, `productId` TEXT, `name` TEXT NOT NULL,
    `quantity` INTEGER NOT NULL, `price` REAL NOT NULL, `cost` REAL NOT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `expenses` (
    `id` TEXT NOT NULL, `businessId` TEXT NOT NULL, `category` TEXT NOT NULL, `description` TEXT,
    `amount` REAL NOT NULL, `isCogs` INTEGER NOT NULL, `notes` TEXT, `createdAt` TEXT NOT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `customers` (
    `id` TEXT NOT NULL, `businessId` TEXT NOT NULL, `name` TEXT NOT NULL, `phone` TEXT, `email` TEXT,
    `notes` TEXT, `balance` REAL NOT NULL, `isActive` INTEGER NOT NULL,
    `createdAt` TEXT NOT NULL, `updatedAt` TEXT NOT NULL,
    PRIMARY KEY(`id`)
);

-- business taxRate 16
INSERT INTO `businesses` VALUES ('b1','Acme','Shop','acme','KSh',16.0,'Thanks','','o1','l1','2025-01-01T00:00:00Z','2025-01-01T00:00:00Z');

-- products: clean values + float precision traps
INSERT INTO `products` VALUES ('p1','b1','c1','Coffee Bag','CB-0001',450.0,600.0,10,5,0,NULL,1,'t1','t1');
INSERT INTO `products` VALUES ('p2','b1','c1','Milk 500ml','CB-0002',49.9,69.0,20,5,0,NULL,1,'t1','t1');
INSERT INTO `products` VALUES ('p3','b1','c1','Airtime KES 5','CB-0003',3.3333,5.0,100,10,0,NULL,1,'t1','t1');
INSERT INTO `products` VALUES ('p4','b1','c1','Fraction 1/3','CB-0004',0.3333333333333333,1.0,50,5,0,NULL,1,'t1','t1');
INSERT INTO `products` VALUES ('p5','b1','c1','Service','CB-0005',0.0,1500.0,0,0,1,NULL,1,'t1','t1');

-- sales: one clean, one with 0.1+0.2 style precision, one with 1/3
INSERT INTO `sales` VALUES ('s1','b1',1750.0,1000.0,750.0,2000.0,250.0,241.38,16.0,'Ann','CASH',NULL,'2025-02-01T10:00:00Z');
INSERT INTO `sales` VALUES ('s2','b1',0.30000000000000004,0.1,0.19999999999999998,0.5,0.2,0.04,16.0,'Bob','MPESA',NULL,'2025-02-01T11:00:00Z');
INSERT INTO `sales` VALUES ('s3','b1',1.0,0.6666666666666666,0.3333333333333334,1.0,0.0,0.05,16.0,NULL,'CASH',NULL,'2025-02-01T12:00:00Z');

-- sale_items
INSERT INTO `sale_items` VALUES ('i1','s1','p1','Coffee Bag',2,600.0,450.0);
INSERT INTO `sale_items` VALUES ('i2','s1','p2','Milk 500ml',1,69.0,49.9);
INSERT INTO `sale_items` VALUES ('i3','s2','p4','Fraction 1/3',1,0.2,0.1);
INSERT INTO `sale_items` VALUES ('i4','s2','p4','Fraction 1/3',1,0.10000000000000002,0.05);

-- expenses
INSERT INTO `expenses` VALUES ('e1','b1','Rent','Monthly rent',25000.0,0,NULL,'2025-02-01T08:00:00Z');
INSERT INTO `expenses` VALUES ('e2','b1','Utilities','Power',1250.75,0,NULL,'2025-02-01T09:00:00Z');

-- customers
INSERT INTO `customers` VALUES ('cu1','b1','Alice','0700000000',NULL,NULL,-250.5,1,'t1','t1');
INSERT INTO `customers` VALUES ('cu2','b1','Bob','0711111111',NULL,NULL,0.0,1,'t1','t1');
SQL

echo "    Pre-migration row counts:"
sqlite3 "$DB" "SELECT '      businesses', COUNT(*) FROM businesses; SELECT '      products', COUNT(*) FROM products; SELECT '      sales', COUNT(*) FROM sales; SELECT '      sale_items', COUNT(*) FROM sale_items; SELECT '      expenses', COUNT(*) FROM expenses; SELECT '      customers', COUNT(*) FROM customers;"

# ---- Run the migration ----
echo ""
echo "Running MIGRATION_5_6 (REAL -> INTEGER, scaled x10,000)..."
migrate
echo "    Migration completed without error."

# ---- Validate ----
echo ""
echo "=== VALIDATION ==="

fail=0
check() {
  local desc="$1"; local sql="$2"; local expect="$3"
  local got
  got=$(sqlite3 "$DB" "$sql" 2>/dev/null | head -1 | tr -d '\n ')
  if [ "$got" = "$expect" ]; then
    echo "  PASS  $desc"
  else
    echo "  FAIL  $desc (got '$got', expected '$expect')"
    fail=1
  fi
}

check "business taxRate 16.0 -> 160000" \
  "SELECT taxRate FROM businesses WHERE id='b1'" "160000"

check "product p1 buyingPrice 450.0 -> 4500000" \
  "SELECT buyingPrice FROM products WHERE id='p1'" "4500000"
check "product p2 sellingPrice 69.0 -> 690000" \
  "SELECT sellingPrice FROM products WHERE id='p2'" "690000"
check "product p3 buyingPrice 3.3333 -> 33333" \
  "SELECT buyingPrice FROM products WHERE id='p3'" "33333"
check "product p4 buyingPrice 1/3 -> 3333 (rounded to 4dp)" \
  "SELECT buyingPrice FROM products WHERE id='p4'" "3333"

check "sale s1 total 1750 -> 17500000" \
  "SELECT total FROM sales WHERE id='s1'" "17500000"
check "sale s2 total 0.30000000000000004 -> 3000" \
  "SELECT total FROM sales WHERE id='s2'" "3000"
check "sale s2 cost 0.1 -> 1000" \
  "SELECT cost FROM sales WHERE id='s2'" "1000"
check "sale s3 total 1.0 -> 10000" \
  "SELECT total FROM sales WHERE id='s3'" "10000"
check "sale s3 profit 1/3 -> 3333" \
  "SELECT profit FROM sales WHERE id='s3'" "3333"

check "item i1 price 600 -> 6000000" \
  "SELECT price FROM sale_items WHERE id='i1'" "6000000"
check "item i4 price 0.10000000000000002 -> 1000" \
  "SELECT price FROM sale_items WHERE id='i4'" "1000"

check "expense e2 amount 1250.75 -> 12507500" \
  "SELECT amount FROM expenses WHERE id='e2'" "12507500"
check "customer cu1 balance -250.5 -> -2505000" \
  "SELECT balance FROM customers WHERE id='cu1'" "-2505000"

# SQL aggregates on migrated INTEGER columns (proves the DAO queries work)
check "SUM(total) aggregation exact across sales" \
  "SELECT SUM(total) FROM sales" "17513000"
check "getTotalsSince-style COUNT(*)" \
  "SELECT COUNT(*) FROM sales" "3"

# ---- Drop shadows check: no leftover _scaled columns ----
if sqlite3 "$DB" "SELECT name FROM pragma_table_info('products') WHERE name LIKE '%scaled%'" | grep -q .; then
  echo "  FAIL  leftover _scaled columns in products"; fail=1
else
  echo "  PASS  no leftover _scaled columns (products)"
fi

echo ""
if [ "$fail" = "0" ]; then
  echo "✅ ALL MIGRATION_5_6 TESTS PASSED"
  exit 0
else
  echo "❌ MIGRATION_5_6 TESTS FAILED"
  exit 1
fi
