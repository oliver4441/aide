-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('CUSTOMER_REQUEST', 'WRONG_ITEM', 'WRONG_QUANTITY', 'DAMAGED_PRODUCT', 'DOUBLE_CHARGE', 'OTHER');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Permission" ADD VALUE 'SHIFT_OPEN';
ALTER TYPE "Permission" ADD VALUE 'SHIFT_CLOSE';
ALTER TYPE "Permission" ADD VALUE 'REFUND_CREATE';
ALTER TYPE "Permission" ADD VALUE 'REFUND_READ';

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "shiftId" TEXT,
ADD COLUMN     "tipAmount" DECIMAL(19,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "refundNo" TEXT NOT NULL,
    "reason" "RefundReason" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "refundedTotal" DECIMAL(19,4) NOT NULL,
    "refundedTax" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "saleId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundLine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(19,4) NOT NULL,
    "cost" DECIMAL(19,4) NOT NULL,
    "refundId" TEXT NOT NULL,

    CONSTRAINT "RefundLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashierShift" (
    "id" TEXT NOT NULL,
    "shiftNo" TEXT NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingCash" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "closingCash" DECIMAL(65,30),
    "expectedCash" DECIMAL(65,30),
    "cashDifference" DECIMAL(19,4),
    "totalSales" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "totalRefunds" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "totalTips" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "cashCount" DECIMAL(65,30),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,

    CONSTRAINT "CashierShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitPayment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saleId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "SplitPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Refund_businessId_idx" ON "Refund"("businessId");

-- CreateIndex
CREATE INDEX "Refund_saleId_idx" ON "Refund"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_businessId_refundNo_key" ON "Refund"("businessId", "refundNo");

-- CreateIndex
CREATE INDEX "RefundLine_refundId_idx" ON "RefundLine"("refundId");

-- CreateIndex
CREATE INDEX "CashierShift_businessId_idx" ON "CashierShift"("businessId");

-- CreateIndex
CREATE INDEX "CashierShift_cashierId_idx" ON "CashierShift"("cashierId");

-- CreateIndex
CREATE INDEX "CashierShift_openedAt_idx" ON "CashierShift"("openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashierShift_businessId_shiftNo_key" ON "CashierShift"("businessId", "shiftNo");

-- CreateIndex
CREATE INDEX "SplitPayment_saleId_idx" ON "SplitPayment"("saleId");

-- CreateIndex
CREATE INDEX "SplitPayment_businessId_idx" ON "SplitPayment"("businessId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CashierShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundLine" ADD CONSTRAINT "RefundLine_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashierShift" ADD CONSTRAINT "CashierShift_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashierShift" ADD CONSTRAINT "CashierShift_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitPayment" ADD CONSTRAINT "SplitPayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitPayment" ADD CONSTRAINT "SplitPayment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
