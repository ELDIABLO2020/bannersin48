-- Customer account (docs/accounts-admin-rbac-plan.md, phase 3).
--
-- Additive: the two V1 notification settings live on "user" (no UserPreference table,
-- plan §4.1). Existing rows keep the defaults; older code ignores the columns, so the
-- migration is rollback-safe.

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "notifyMarketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyOrderUpdates" BOOLEAN NOT NULL DEFAULT true;
