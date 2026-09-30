-- Use lz4 (instead of pglz) for the wide JSONB columns that get TOASTed.
--
-- SET COMPRESSION only changes the method used for values written from now on:
-- existing rows are not rewritten, the statement is a catalog-only change
-- (brief ACCESS EXCLUSIVE lock, no table scan) and re-running it is a no-op.
-- Production also sets default_toast_compression = lz4 in postgresql.conf for
-- any column not listed here. Requires a server built with lz4 (the official
-- postgres:16 images are). Prisma does not model column compression, so this
-- causes no schema drift.
--
-- Table/column names verified against schema.prisma (@@map, no column @map)
-- and migration 20260823023354_snake_case_tables.

ALTER TABLE "quote"
  ALTER COLUMN "request" SET COMPRESSION lz4,
  ALTER COLUMN "breakdown" SET COMPRESSION lz4;

ALTER TABLE "order_item"
  ALTER COLUMN "configSnapshot" SET COMPRESSION lz4,
  ALTER COLUMN "finishings" SET COMPRESSION lz4;

ALTER TABLE "order"
  ALTER COLUMN "shipAddress" SET COMPRESSION lz4;

ALTER TABLE "audit_log"
  ALTER COLUMN "diff" SET COMPRESSION lz4;

ALTER TABLE "email_log"
  ALTER COLUMN "payload" SET COMPRESSION lz4;

ALTER TABLE "artwork_file"
  ALTER COLUMN "dpiReport" SET COMPRESSION lz4;

ALTER TABLE "saved_design"
  ALTER COLUMN "config" SET COMPRESSION lz4;

ALTER TABLE "site_content"
  ALTER COLUMN "payload" SET COMPRESSION lz4;

ALTER TABLE "shipment"
  ALTER COLUMN "trackingEvents" SET COMPRESSION lz4;
