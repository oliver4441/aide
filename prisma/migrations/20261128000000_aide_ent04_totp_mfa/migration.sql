-- CreateTable
CREATE TABLE "AdminMfaMethod" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminMfaMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMfaMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMfaMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminMfaMethod_adminId_key" ON "AdminMfaMethod"("adminId");

-- CreateIndex
CREATE INDEX "AdminMfaMethod_adminId_idx" ON "AdminMfaMethod"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMfaMethod_userId_key" ON "UserMfaMethod"("userId");

-- CreateIndex
CREATE INDEX "UserMfaMethod_userId_idx" ON "UserMfaMethod"("userId");

-- AddForeignKey
ALTER TABLE "AdminMfaMethod" ADD CONSTRAINT "AdminMfaMethod_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMfaMethod" ADD CONSTRAINT "UserMfaMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
