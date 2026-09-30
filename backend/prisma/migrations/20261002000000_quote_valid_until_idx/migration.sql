-- Supports the daily purge of expired quotes (QuotePurgeService).
-- CreateIndex
CREATE INDEX "quote_validUntil_idx" ON "quote"("validUntil");
