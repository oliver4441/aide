-- AIDE-12: approval workflows and separation of duties

CREATE TYPE "ApprovalActionType" AS ENUM ('STOCK_ADJUSTMENT', 'PURCHASE_ORDER', 'SUPPLIER_PAYMENT', 'REFUND', 'JOURNAL', 'PRICE_CHANGE', 'DISCOUNT', 'EXPENSE', 'PERIOD_CLOSE');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "ApprovalDecisionType" AS ENUM ('APPROVE', 'REJECT');

-- CreateTable
CREATE TABLE "ApprovalGroup" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalPolicy" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "actionType" "ApprovalActionType" NOT NULL,
    "threshold" DECIMAL(19,4),
    "minApprovals" INTEGER NOT NULL DEFAULT 1,
    "requireSeparation" BOOLEAN NOT NULL DEFAULT true,
    "escalationHours" INTEGER,
    "escalationGroupId" TEXT,
    "approverGroupId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDelegation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "actionType" "ApprovalActionType" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "amount" DECIMAL(19,4),
    "payload" JSONB,
    "requesterId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "policyId" TEXT NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "policyName" TEXT NOT NULL,
    "minApprovals" INTEGER NOT NULL,
    "requireSeparation" BOOLEAN NOT NULL,
    "approverGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDecision" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "decision" "ApprovalDecisionType" NOT NULL,
    "comments" TEXT,
    "policyVersion" INTEGER NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "ApprovalGroup_businessId_name_key" ON "ApprovalGroup"("businessId", "name");
CREATE INDEX "ApprovalGroup_businessId_idx" ON "ApprovalGroup"("businessId");
CREATE UNIQUE INDEX "ApprovalGroupMember_groupId_userId_key" ON "ApprovalGroupMember"("groupId", "userId");
CREATE INDEX "ApprovalGroupMember_userId_idx" ON "ApprovalGroupMember"("userId");
CREATE UNIQUE INDEX "ApprovalPolicy_businessId_actionType_version_key" ON "ApprovalPolicy"("businessId", "actionType", "version");
CREATE INDEX "ApprovalPolicy_businessId_actionType_idx" ON "ApprovalPolicy"("businessId", "actionType");
CREATE INDEX "ApprovalDelegation_businessId_fromUserId_idx" ON "ApprovalDelegation"("businessId", "fromUserId");
CREATE INDEX "ApprovalDelegation_businessId_toUserId_idx" ON "ApprovalDelegation"("businessId", "toUserId");
CREATE INDEX "ApprovalRequest_businessId_status_idx" ON "ApprovalRequest"("businessId", "status");
CREATE INDEX "ApprovalRequest_resourceType_resourceId_idx" ON "ApprovalRequest"("resourceType", "resourceId");
CREATE UNIQUE INDEX "ApprovalDecision_requestId_actorId_key" ON "ApprovalDecision"("requestId", "actorId");
CREATE INDEX "ApprovalDecision_requestId_idx" ON "ApprovalDecision"("requestId");

-- Foreign keys
ALTER TABLE "ApprovalGroup" ADD CONSTRAINT "ApprovalGroup_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalGroupMember" ADD CONSTRAINT "ApprovalGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ApprovalGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalPolicy" ADD CONSTRAINT "ApprovalPolicy_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalPolicy" ADD CONSTRAINT "ApprovalPolicy_escalationGroupId_fkey" FOREIGN KEY ("escalationGroupId") REFERENCES "ApprovalGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalPolicy" ADD CONSTRAINT "ApprovalPolicy_approverGroupId_fkey" FOREIGN KEY ("approverGroupId") REFERENCES "ApprovalGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalDelegation" ADD CONSTRAINT "ApprovalDelegation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalDelegation" ADD CONSTRAINT "ApprovalDelegation_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalDelegation" ADD CONSTRAINT "ApprovalDelegation_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
