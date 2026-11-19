-- CreateEnum
CREATE TYPE "StockAdjustmentReason" AS ENUM ('COUNT_DIFFERENCE', 'DAMAGE', 'THEFT', 'EXPIRED', 'RETURN_TO_SUPPLIER', 'CUSTOMER_RETURN', 'GIFT_SAMPLE', 'WRITE_OFF', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Permission" ADD VALUE 'STOCK_ADJUST_CREATE';
ALTER TYPE "Permission" ADD VALUE 'STOCK_ADJUST_READ';

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL,
    "adjustmentNo" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" "StockAdjustmentReason" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustmentLine" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "unitCost" DECIMAL(19,4) NOT NULL,
    "adjustmentId" TEXT NOT NULL,
    "productId" TEXT,

    CONSTRAINT "StockAdjustmentLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockAdjustment_businessId_idx" ON "StockAdjustment"("businessId");

-- CreateIndex
CREATE INDEX "StockAdjustment_date_idx" ON "StockAdjustment"("date");

-- CreateIndex
CREATE UNIQUE INDEX "StockAdjustment_businessId_adjustmentNo_key" ON "StockAdjustment"("businessId", "adjustmentNo");

-- CreateIndex
CREATE INDEX "StockAdjustmentLine_adjustmentId_idx" ON "StockAdjustmentLine"("adjustmentId");

-- CreateIndex
CREATE INDEX "StockAdjustmentLine_productId_idx" ON "StockAdjustmentLine"("productId");

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustmentLine" ADD CONSTRAINT "StockAdjustmentLine_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "StockAdjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustmentLine" ADD CONSTRAINT "StockAdjustmentLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
