-- RBAC cleanup (docs/accounts-admin-rbac-plan.md, phase 5, task 5.2).
--
-- user.roleId becomes NOT NULL: every account now holds exactly one access role, and
-- the legacy user.role enum is purely derived from it. The backfill from the phase 1
-- migration is repeated first so rows created between the two deploys (older builds
-- registered customers without a roleId) are covered, then the foreign key is
-- re-created as RESTRICT (a role with members can no longer be deleted at the
-- database level either; the API already answers 409 ROLE_IN_USE).
--
-- This is the one migration an older build would trip on (it inserts users without
-- roleId), which is why it ships last. DDL generated with `prisma migrate diff`.

-- Backfill: any account still without a role gets the system role for its legacy kind.
UPDATE "user" u
SET "roleId" = r."id"
FROM "access_role" r
WHERE u."roleId" IS NULL
  AND r."isSystem" = true
  AND r."legacyRole" = u."role";

-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_roleId_fkey";

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "roleId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "access_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
