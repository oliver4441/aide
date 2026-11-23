-- AIDE-22: Data import — auditable import batches

CREATE TYPE "ImportEntity" AS ENUM ('PRODUCTS', 'CUSTOMERS');
CREATE TYPE "ImportBatchStatus" AS ENUM ('COMPLETED', 'ROLLED_BACK');
CREATE TYPE "ImportDuplicateStrategy" AS ENUM ('SKIP', 'MERGE');

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "entity" "ImportEntity" NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'COMPLETED',
    "duplicateStrategy" "ImportDuplicateStrategy" NOT NULL DEFAULT 'SKIP',
    "mapping" JSONB,
    "totalRows" INTEGER NOT NULL,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdIds" JSONB,
    "updatedSnapshot" JSONB,
    "errorReport" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rolledBackAt" TIMESTAMP(3),
    "businessId" TEXT NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportBatch_businessId_createdAt_idx" ON "ImportBatch"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "ImportBatch"
    ADD CONSTRAINT "ImportBatch_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
