-- CreateEnum
CREATE TYPE "OrganisationPlan" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "organisations" ADD COLUMN     "plan" "OrganisationPlan" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "upgrade_requests" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upgrade_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upgrade_requests_organisationId_key" ON "upgrade_requests"("organisationId");

-- CreateIndex
CREATE INDEX "upgrade_requests_userId_idx" ON "upgrade_requests"("userId");

-- AddForeignKey
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

