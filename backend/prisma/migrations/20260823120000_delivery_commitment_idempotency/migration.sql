-- Delivery commitment persistence + order idempotency (Wave 5).
-- The committed delivery date is persisted once manual payment is confirmed
-- (the effective SLA start per D6), instead of being recomputed on read.
ALTER TABLE "order" ADD COLUMN "paymentConfirmedAt" TIMESTAMP(3);
ALTER TABLE "order" ADD COLUMN "committedDeliveryDate" TEXT;
ALTER TABLE "order" ADD COLUMN "committedDeliveryDow" TEXT;
ALTER TABLE "order" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "order_idempotencyKey_key" ON "order"("idempotencyKey");
