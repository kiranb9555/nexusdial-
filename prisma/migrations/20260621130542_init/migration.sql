-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('BASIC', 'PRO');

-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('ANSWERED', 'MISSED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "planTier" "PlanTier" NOT NULL DEFAULT 'BASIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualNumber" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "e164Number" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "provisionedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VirtualNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "virtualNumberId" TEXT NOT NULL,
    "contactId" TEXT,
    "direction" "CallDirection" NOT NULL,
    "status" "CallStatus" NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "recordingKey" TEXT,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceJob" (
    "id" TEXT NOT NULL,
    "callRecordId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "transcript" TEXT,
    "extractedData" JSONB,
    "processingMs" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntelligenceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTx" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "WalletTxType" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberPool" (
    "id" TEXT NOT NULL,
    "e164Number" TEXT NOT NULL,
    "isAssigned" BOOLEAN NOT NULL DEFAULT false,
    "assignedToTenantId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NumberPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_mobile_key" ON "Tenant"("mobile");

-- CreateIndex
CREATE INDEX "Tenant_mobile_idx" ON "Tenant"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualNumber_e164Number_key" ON "VirtualNumber"("e164Number");

-- CreateIndex
CREATE INDEX "VirtualNumber_tenantId_idx" ON "VirtualNumber"("tenantId");

-- CreateIndex
CREATE INDEX "Contact_tenantId_idx" ON "Contact"("tenantId");

-- CreateIndex
CREATE INDEX "Contact_tenantId_callCount_idx" ON "Contact"("tenantId", "callCount");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_tenantId_phoneNumber_key" ON "Contact"("tenantId", "phoneNumber");

-- CreateIndex
CREATE INDEX "CallRecord_tenantId_idx" ON "CallRecord"("tenantId");

-- CreateIndex
CREATE INDEX "CallRecord_tenantId_createdAt_idx" ON "CallRecord"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "CallRecord_contactId_idx" ON "CallRecord"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "IntelligenceJob_callRecordId_key" ON "IntelligenceJob"("callRecordId");

-- CreateIndex
CREATE INDEX "WalletTx_tenantId_idx" ON "WalletTx"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "NumberPool_e164Number_key" ON "NumberPool"("e164Number");

-- CreateIndex
CREATE INDEX "NumberPool_isAssigned_idx" ON "NumberPool"("isAssigned");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_tenantId_idx" ON "RefreshToken"("tenantId");

-- AddForeignKey
ALTER TABLE "VirtualNumber" ADD CONSTRAINT "VirtualNumber_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRecord" ADD CONSTRAINT "CallRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRecord" ADD CONSTRAINT "CallRecord_virtualNumberId_fkey" FOREIGN KEY ("virtualNumberId") REFERENCES "VirtualNumber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRecord" ADD CONSTRAINT "CallRecord_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceJob" ADD CONSTRAINT "IntelligenceJob_callRecordId_fkey" FOREIGN KEY ("callRecordId") REFERENCES "CallRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTx" ADD CONSTRAINT "WalletTx_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumberPool" ADD CONSTRAINT "NumberPool_assignedToTenantId_fkey" FOREIGN KEY ("assignedToTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
