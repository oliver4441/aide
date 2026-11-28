-- AIDE-ADMIN-01: platform subscription and billing domain.
-- Additive only: no merchant table is altered beyond a nullable billing email
-- on Organization. Existing rows are untouched.

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "billingEmail" TEXT;

CREATE TYPE "PlatformBillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "PlatformPlanVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "PlatformSubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'CANCELED', 'EXPIRED');
CREATE TYPE "PlatformInvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');
CREATE TYPE "PlatformPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');
CREATE TYPE "PlatformWebhookEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER');

CREATE TABLE "PlatformPlan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformPlan_key_key" ON "PlatformPlan"("key");

CREATE TABLE "PlatformPlanVersion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "PlatformPlanVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "interval" "PlatformBillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "entitlements" JSONB,
    "limits" JSONB,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformPlanVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformPlanVersion_planId_version_key" ON "PlatformPlanVersion"("planId", "version");
CREATE INDEX "PlatformPlanVersion_planId_status_idx" ON "PlatformPlanVersion"("planId", "status");

CREATE TABLE "PlatformSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "status" "PlatformSubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerSubscriptionId" TEXT,
    "amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "interval" "PlatformBillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "localOverrideNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformSubscription_organizationId_key" ON "PlatformSubscription"("organizationId");
CREATE UNIQUE INDEX "PlatformSubscription_providerSubscriptionId_key" ON "PlatformSubscription"("providerSubscriptionId");
CREATE INDEX "PlatformSubscription_status_idx" ON "PlatformSubscription"("status");
CREATE INDEX "PlatformSubscription_currentPeriodEnd_idx" ON "PlatformSubscription"("currentPeriodEnd");
CREATE INDEX "PlatformSubscription_planId_idx" ON "PlatformSubscription"("planId");

CREATE TABLE "PlatformInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "number" TEXT NOT NULL,
    "providerInvoiceId" TEXT,
    "status" "PlatformInvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "amount" DECIMAL(19,4) NOT NULL,
    "amountPaid" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "hostedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformInvoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformInvoice_number_key" ON "PlatformInvoice"("number");
CREATE UNIQUE INDEX "PlatformInvoice_providerInvoiceId_key" ON "PlatformInvoice"("providerInvoiceId");
CREATE INDEX "PlatformInvoice_organizationId_idx" ON "PlatformInvoice"("organizationId");
CREATE INDEX "PlatformInvoice_status_idx" ON "PlatformInvoice"("status");
CREATE INDEX "PlatformInvoice_issuedAt_idx" ON "PlatformInvoice"("issuedAt");

CREATE TABLE "PlatformPayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "status" "PlatformPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformPayment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformPayment_providerPaymentId_key" ON "PlatformPayment"("providerPaymentId");
CREATE INDEX "PlatformPayment_invoiceId_idx" ON "PlatformPayment"("invoiceId");
CREATE INDEX "PlatformPayment_status_idx" ON "PlatformPayment"("status");
CREATE INDEX "PlatformPayment_attemptedAt_idx" ON "PlatformPayment"("attemptedAt");

CREATE TABLE "PlatformWebhookEvent" (
    "id" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "PlatformWebhookEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "correlationId" TEXT,
    "organizationId" TEXT,
    "subscriptionId" TEXT,
    "invoiceId" TEXT,
    "payloadSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformWebhookEvent_providerEventId_key" ON "PlatformWebhookEvent"("providerEventId");
CREATE INDEX "PlatformWebhookEvent_status_receivedAt_idx" ON "PlatformWebhookEvent"("status", "receivedAt");
CREATE INDEX "PlatformWebhookEvent_type_idx" ON "PlatformWebhookEvent"("type");
CREATE INDEX "PlatformWebhookEvent_organizationId_idx" ON "PlatformWebhookEvent"("organizationId");

CREATE TABLE "PlatformAuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "reason" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlatformAuditEvent_createdAt_idx" ON "PlatformAuditEvent"("createdAt");
CREATE INDEX "PlatformAuditEvent_entityType_entityId_idx" ON "PlatformAuditEvent"("entityType", "entityId");
CREATE INDEX "PlatformAuditEvent_actorId_createdAt_idx" ON "PlatformAuditEvent"("actorId", "createdAt");

CREATE TABLE "PlatformSupportNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "subscriptionId" TEXT,
    "invoiceId" TEXT,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformSupportNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlatformSupportNote_organizationId_createdAt_idx" ON "PlatformSupportNote"("organizationId", "createdAt");
CREATE INDEX "PlatformSupportNote_subscriptionId_createdAt_idx" ON "PlatformSupportNote"("subscriptionId", "createdAt");

ALTER TABLE "PlatformPlanVersion" ADD CONSTRAINT "PlatformPlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlatformPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformSubscription" ADD CONSTRAINT "PlatformSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformSubscription" ADD CONSTRAINT "PlatformSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlatformPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformSubscription" ADD CONSTRAINT "PlatformSubscription_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlatformPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PlatformSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformPayment" ADD CONSTRAINT "PlatformPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformWebhookEvent" ADD CONSTRAINT "PlatformWebhookEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformWebhookEvent" ADD CONSTRAINT "PlatformWebhookEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PlatformSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformWebhookEvent" ADD CONSTRAINT "PlatformWebhookEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformSupportNote" ADD CONSTRAINT "PlatformSupportNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformSupportNote" ADD CONSTRAINT "PlatformSupportNote_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PlatformSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformSupportNote" ADD CONSTRAINT "PlatformSupportNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
