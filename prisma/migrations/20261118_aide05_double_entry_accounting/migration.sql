-- AIDE-05: Double-entry accounting schema

-- Enums
CREATE TYPE "public"."accounttype" AS ENUM('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');
CREATE TYPE "public"."accountsubtype" AS ENUM(
  'CURRENT_ASSET', 'FIXED_ASSET', 'ACCOUNTS_RECEIVABLE',
  'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'ACCOUNTS_PAYABLE',
  'OWNER_EQUITY', 'RETAINED_EARNINGS',
  'SALES_REVENUE', 'SERVICE_REVENUE', 'OTHER_INCOME',
  'COST_OF_GOODS_SOLD', 'OPERATING_EXPENSE', 'SALARIES_EXPENSE',
  'UTILITIES_EXPENSE', 'RENT_EXPENSE', 'DEPRECIATION_EXPENSE', 'OTHER_EXPENSE'
);
CREATE TYPE "public"."journalstatus" AS ENUM('DRAFT', 'POSTED', 'REVERSED');
CREATE TYPE "public"."periodstatus" AS ENUM('OPEN', 'CLOSED', 'LOCKED');

-- Account (Chart of Accounts)
CREATE TABLE "Account" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "accounttype" NOT NULL,
  "subType" "accountsubtype" NOT NULL DEFAULT 'OTHER_EXPENSE',
  "description" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "businessId" TEXT NOT NULL,

  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- JournalEntry
CREATE TABLE "JournalEntry" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "entryNumber" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "status" "journalstatus" NOT NULL DEFAULT 'POSTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "businessId" TEXT NOT NULL,

  CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- JournalLine
CREATE TABLE "JournalLine" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "lineOrder" INTEGER NOT NULL,
  "description" TEXT,
  "debit" DECIMAL(19,4) NOT NULL,
  "credit" DECIMAL(19,4) NOT NULL,
  "entryId" TEXT NOT NULL,
  "debitAccountId" TEXT,
  "creditAccountId" TEXT,

  CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- AccountingPeriod
CREATE TABLE "AccountingPeriod" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "status" "periodstatus" NOT NULL DEFAULT 'OPEN',
  "closedAt" TIMESTAMP(3),
  "closedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "businessId" TEXT NOT NULL,

  CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "Account" ADD CONSTRAINT "Account_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_debitAccountId_fkey"
  FOREIGN KEY ("debitAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_creditAccountId_fkey"
  FOREIGN KEY ("creditAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraints
CREATE UNIQUE INDEX "Account_businessId_code_key" ON "Account"("businessId", "code");
CREATE UNIQUE INDEX "JournalEntry_businessId_entryNumber_key" ON "JournalEntry"("businessId", "entryNumber");
CREATE UNIQUE INDEX "AccountingPeriod_businessId_year_month_key" ON "AccountingPeriod"("businessId", "year", "month");

-- Indexes
CREATE INDEX "Account_businessId_idx" ON "Account"("businessId");
CREATE INDEX "Account_type_idx" ON "Account"("type");
CREATE INDEX "JournalEntry_businessId_idx" ON "JournalEntry"("businessId");
CREATE INDEX "JournalEntry_date_idx" ON "JournalEntry"("date");
CREATE INDEX "JournalEntry_sourceType_sourceId_idx" ON "JournalEntry"("sourceType", "sourceId");
CREATE INDEX "JournalLine_entryId_idx" ON "JournalLine"("entryId");
CREATE INDEX "JournalLine_debitAccountId_idx" ON "JournalLine"("debitAccountId");
CREATE INDEX "JournalLine_creditAccountId_idx" ON "JournalLine"("creditAccountId");
CREATE INDEX "AccountingPeriod_businessId_idx" ON "AccountingPeriod"("businessId");
