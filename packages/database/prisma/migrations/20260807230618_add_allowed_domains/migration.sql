-- NOTE: not dropping "document_chunks_embedding_hnsw_idx" — see KN-001's
-- migration; Prisma's diff engine proposes this on every unrelated schema
-- change because that hand-added index isn't representable in schema.prisma.

-- CreateTable
CREATE TABLE "allowed_domains" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allowed_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "allowed_domains_botId_idx" ON "allowed_domains"("botId");

-- CreateIndex
CREATE UNIQUE INDEX "allowed_domains_botId_pattern_key" ON "allowed_domains"("botId", "pattern");

-- AddForeignKey
ALTER TABLE "allowed_domains" ADD CONSTRAINT "allowed_domains_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allowed_domains" ADD CONSTRAINT "allowed_domains_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allowed_domains" ADD CONSTRAINT "allowed_domains_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
