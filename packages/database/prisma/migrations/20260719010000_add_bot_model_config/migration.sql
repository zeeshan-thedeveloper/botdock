ALTER TABLE "bots"
  ADD COLUMN "providerCredentialId" TEXT,
  ADD COLUMN "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  ADD COLUMN "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
  ADD COLUMN "responseLength" TEXT NOT NULL DEFAULT 'balanced',
  ADD COLUMN "retrievalMode" TEXT NOT NULL DEFAULT 'hybrid',
  ADD COLUMN "maxSources" INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN "citationStyle" TEXT NOT NULL DEFAULT 'inline_source_chips';

CREATE INDEX "bots_providerCredentialId_idx" ON "bots"("providerCredentialId");

ALTER TABLE "bots"
  ADD CONSTRAINT "bots_providerCredentialId_fkey"
  FOREIGN KEY ("providerCredentialId") REFERENCES "provider_credentials"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
