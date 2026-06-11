-- Existing mock payment events predate provider ids. Backfill stable ids so the
-- new uniqueness constraint can be applied without dropping local demo data.
ALTER TABLE "PaymentEvent" ADD COLUMN "providerEventId" TEXT;

UPDATE "PaymentEvent"
SET "providerEventId" = 'legacy_' || "id"
WHERE "providerEventId" IS NULL;

ALTER TABLE "PaymentEvent" ALTER COLUMN "providerEventId" SET NOT NULL;

CREATE UNIQUE INDEX "PaymentEvent_providerEventId_key" ON "PaymentEvent"("providerEventId");
