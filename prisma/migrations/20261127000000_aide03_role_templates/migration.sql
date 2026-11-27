-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "cashierUserId" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "ownRecordsOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roleTemplate" TEXT,
ADD COLUMN     "scopeType" TEXT,
ADD COLUMN     "terminalId" TEXT,
ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "roleTemplate" TEXT;

-- CreateIndex
CREATE INDEX "Sale_businessId_cashierUserId_idx" ON "Sale"("businessId", "cashierUserId");

-- CreateIndex
CREATE INDEX "Employee_roleTemplate_idx" ON "Employee"("roleTemplate");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE INDEX "Employee_warehouseId_idx" ON "Employee"("warehouseId");

-- CreateIndex
CREATE INDEX "Employee_terminalId_idx" ON "Employee"("terminalId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

