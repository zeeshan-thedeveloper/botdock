-- CreateEnum
CREATE TYPE "DeploymentEnvironment" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- NOTE: not dropping "document_chunks_embedding_hnsw_idx" — see KN-001's
-- migration; Prisma's diff engine proposes this on every unrelated schema
-- change because that hand-added index isn't representable in schema.prisma.

-- CreateTable
CREATE TABLE "bot_versions" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "configSnapshot" JSONB NOT NULL,
    "note" TEXT,
    "publishedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_deployments" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "environment" "DeploymentEnvironment" NOT NULL,
    "currentVersionId" TEXT,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bot_versions_botId_createdAt_idx" ON "bot_versions"("botId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bot_versions_botId_versionNumber_key" ON "bot_versions"("botId", "versionNumber");

-- CreateIndex
CREATE INDEX "bot_deployments_organisationId_idx" ON "bot_deployments"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "bot_deployments_botId_environment_key" ON "bot_deployments"("botId", "environment");

-- AddForeignKey
ALTER TABLE "bot_versions" ADD CONSTRAINT "bot_versions_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_versions" ADD CONSTRAINT "bot_versions_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_versions" ADD CONSTRAINT "bot_versions_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_deployments" ADD CONSTRAINT "bot_deployments_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_deployments" ADD CONSTRAINT "bot_deployments_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_deployments" ADD CONSTRAINT "bot_deployments_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "bot_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
