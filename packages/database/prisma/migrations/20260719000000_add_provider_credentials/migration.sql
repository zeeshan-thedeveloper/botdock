-- CreateEnum
CREATE TYPE "ModelProvider" AS ENUM ('OPENAI', 'ANTHROPIC');

-- CreateEnum
CREATE TYPE "ProviderCredentialStatus" AS ENUM ('ACTIVE', 'INVALID');

-- CreateTable
CREATE TABLE "provider_credentials" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "provider" "ModelProvider" NOT NULL,
    "label" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "status" "ProviderCredentialStatus" NOT NULL DEFAULT 'INVALID',
    "createdById" TEXT NOT NULL,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provider_credentials_organisationId_provider_label_key" ON "provider_credentials"("organisationId", "provider", "label");

-- CreateIndex
CREATE INDEX "provider_credentials_organisationId_idx" ON "provider_credentials"("organisationId");

-- CreateIndex
CREATE INDEX "provider_credentials_createdById_idx" ON "provider_credentials"("createdById");

-- AddForeignKey
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
