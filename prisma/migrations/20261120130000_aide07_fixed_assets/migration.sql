-- AIDE-07 / ACC-11: fixed asset register and monthly depreciation entries.

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE');

-- CreateEnum
CREATE TYPE "FixedAssetStatus" AS ENUM ('ACTIVE', 'DISPOSED');

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "cost" DECIMAL(19,4) NOT NULL,
    "salvageValue" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "usefulLifeMonths" INTEGER NOT NULL,
    "method" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "status" "FixedAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "disposedAt" TIMESTAMP(3),
    "disposalProceeds" DECIMAL(19,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepreciationEntry" (
    "id" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "accumulated" DECIMAL(19,4) NOT NULL,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "DepreciationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedAsset_businessId_idx" ON "FixedAsset"("businessId");

-- CreateIndex
CREATE INDEX "FixedAsset_businessId_status_idx" ON "FixedAsset"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_businessId_assetCode_key" ON "FixedAsset"("businessId", "assetCode");

-- CreateIndex
CREATE INDEX "DepreciationEntry_assetId_idx" ON "DepreciationEntry"("assetId");

-- CreateIndex
CREATE INDEX "DepreciationEntry_periodYear_periodMonth_idx" ON "DepreciationEntry"("periodYear", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "DepreciationEntry_assetId_periodYear_periodMonth_key" ON "DepreciationEntry"("assetId", "periodYear", "periodMonth");

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepreciationEntry" ADD CONSTRAINT "DepreciationEntry_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
