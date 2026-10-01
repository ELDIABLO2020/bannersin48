-- RBAC core (docs/accounts-admin-rbac-plan.md, phase 1).
--
-- Additive: new tables (access_role, permission, role_permission, user_permission,
-- action_token), new nullable User columns, UserStatus.INVITED, RefreshToken session
-- columns and the two audit_log composite indexes from the security review. Then seeds
-- the permission catalog, the four system roles and three custom role templates, and
-- backfills user.roleId from the legacy user.role enum. Re-runnable seeds (ON CONFLICT
-- DO NOTHING); older code ignores the new tables, so this migration is rollback-safe.
--
-- DDL generated with `prisma migrate diff`; the seed block mirrors @bannersin48/shared
-- PERMISSIONS / SYSTEM_ROLE_DEFAULTS / TEMPLATE_ROLE_DEFAULTS (rbac.service.spec.ts
-- checks the two stay in sync).

-- CreateEnum
CREATE TYPE "PermissionEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "ActionTokenPurpose" AS ENUM ('STAFF_INVITE', 'EMAIL_CHANGE', 'EMAIL_VERIFY');

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'INVITED';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "invitedBy" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "pendingEmail" TEXT,
ADD COLUMN     "roleId" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT;

-- AlterTable
ALTER TABLE "refresh_token" ADD COLUMN     "label" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "access_role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "legacyRole" "Role" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "key" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "elevated" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "roleId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("roleId","permissionKey")
);

-- CreateTable
CREATE TABLE "user_permission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "effect" "PermissionEffect" NOT NULL,
    "reason" TEXT,
    "grantedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "ActionTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "payload" JSONB,
    "roleId" TEXT,
    "requestedBy" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "access_role_key_key" ON "access_role"("key");

-- CreateIndex
CREATE INDEX "permission_resource_idx" ON "permission"("resource");

-- CreateIndex
CREATE INDEX "role_permission_permissionKey_idx" ON "role_permission"("permissionKey");

-- CreateIndex
CREATE INDEX "user_permission_userId_idx" ON "user_permission"("userId");

-- CreateIndex
CREATE INDEX "user_permission_expiresAt_idx" ON "user_permission"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_permission_userId_permissionKey_key" ON "user_permission"("userId", "permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "action_token_tokenHash_key" ON "action_token"("tokenHash");

-- CreateIndex
CREATE INDEX "action_token_userId_purpose_idx" ON "action_token"("userId", "purpose");

-- CreateIndex
CREATE INDEX "action_token_expiresAt_idx" ON "action_token"("expiresAt");

-- CreateIndex
CREATE INDEX "user_roleId_idx" ON "user"("roleId");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_createdAt_idx" ON "audit_log"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_log_actorId_createdAt_idx" ON "audit_log"("actorId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "access_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "access_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permissionKey_fkey" FOREIGN KEY ("permissionKey") REFERENCES "permission"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission" ADD CONSTRAINT "user_permission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission" ADD CONSTRAINT "user_permission_permissionKey_fkey" FOREIGN KEY ("permissionKey") REFERENCES "permission"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission" ADD CONSTRAINT "user_permission_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_token" ADD CONSTRAINT "action_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_token" ADD CONSTRAINT "action_token_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "access_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------

-- Seed: permission catalog (mirrors @bannersin48/shared PERMISSIONS; RbacService.syncCatalog keeps it current).
INSERT INTO "permission" ("key", "resource", "action", "description", "elevated", "sort") VALUES
  ('orders:read', 'orders', 'read', 'Order board, buckets, list, detail and artwork previews on an order', false, 0),
  ('orders:update_status', 'orders', 'update_status', 'Move orders to IN_PROCESSING, ACCEPTED, SHIPPED or DELIVERED', false, 1),
  ('orders:hold', 'orders', 'hold', 'Place orders on hold and release them', false, 2),
  ('orders:cancel', 'orders', 'cancel', 'Cancel orders on the customer''s behalf', false, 3),
  ('orders:dropship', 'orders', 'dropship', 'Record the drop-ship submission for an order', false, 4),
  ('orders:tracking', 'orders', 'tracking', 'Attach a tracking number and shipping label', false, 5),
  ('orders:note', 'orders', 'note', 'Add an internal activity note to an order', false, 6),
  ('payments:mark_paid', 'payments', 'mark_paid', 'Record a manual payment and start the delivery clock', true, 7),
  ('payments:refund', 'payments', 'refund', 'Issue refunds (reserved; not wired in V1)', true, 8),
  ('customers:read', 'customers', 'read', 'Search customers and view their profile, addresses and order history', false, 9),
  ('customers:update', 'customers', 'update', 'Edit a customer''s name, phone or addresses on their behalf', false, 10),
  ('customers:reset_password', 'customers', 'reset_password', 'Send an admin-initiated password reset to a customer', false, 11),
  ('customers:suspend', 'customers', 'suspend', 'Suspend or reactivate a customer account', true, 12),
  ('artwork:read_any', 'artwork', 'read_any', 'Download or preview any customer''s artwork', false, 13),
  ('rewards:read', 'rewards', 'read', 'View a customer''s reward ledger', false, 14),
  ('rewards:adjust', 'rewards', 'adjust', 'Adjust a customer''s reward balance with a reason', true, 15),
  ('catalog:read', 'catalog', 'read', 'View products, materials, finishing options and volume tiers', false, 16),
  ('catalog:write', 'catalog', 'write', 'Create, update or deactivate products, materials and finishing options', true, 17),
  ('pricing:write', 'pricing', 'write', 'Change rates, flat prices, multipliers and volume tiers', true, 18),
  ('promos:read', 'promos', 'read', 'List promo codes', false, 19),
  ('promos:write', 'promos', 'write', 'Create, update or deactivate promo codes', true, 20),
  ('content:read', 'content', 'read', 'View CMS content blocks in the admin', false, 21),
  ('content:edit', 'content', 'edit', 'Edit CMS block content', false, 22),
  ('content:publish', 'content', 'publish', 'Publish, unpublish or delete CMS blocks', false, 23),
  ('users:read', 'users', 'read', 'List and view staff accounts', false, 24),
  ('users:create', 'users', 'create', 'Create or invite staff accounts', true, 25),
  ('users:update', 'users', 'update', 'Edit a staff account and assign non-elevated roles', true, 26),
  ('users:suspend', 'users', 'suspend', 'Suspend or reactivate staff accounts and revoke their sessions', true, 27),
  ('users:reset_password', 'users', 'reset_password', 'Send an admin-initiated password reset to a staff account', true, 28),
  ('rbac:read', 'rbac', 'read', 'View roles, their permissions and any user''s effective permissions', false, 29),
  ('rbac:manage', 'rbac', 'manage', 'Manage roles and permissions, grant elevated permissions and overrides', true, 30),
  ('audit:read', 'audit', 'read', 'Read the audit log', true, 31),
  ('settings:read', 'settings', 'read', 'View site settings (reserved; not wired in V1)', true, 32),
  ('settings:write', 'settings', 'write', 'Change site settings (reserved; not wired in V1)', true, 33)
ON CONFLICT ("key") DO NOTHING;

-- Seed: system roles (immutable set; admin = wildcard, customer = empty) and custom role templates.
INSERT INTO "access_role" ("id", "key", "name", "description", "legacyRole", "isSystem", "createdAt", "updatedAt") VALUES
  ('role_system_admin', 'admin', 'Admin', 'Full access to everything, including roles and permissions.', 'ADMIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_system_staff', 'staff', 'Staff', 'Default employee role: fulfillment and customer lookup. No payments or password resets.', 'STAFF', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_system_content_editor', 'content_editor', 'Content editor', 'Edits and publishes storefront content blocks.', 'CONTENT_EDITOR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_system_customer', 'customer', 'Customer', 'Storefront account. No admin permissions.', 'CUSTOMER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_template_fulfillment', 'fulfillment', 'Fulfillment', 'Runs the order board: processing, drop-ship, tracking and holds. No payments.', 'STAFF', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_template_support', 'support', 'Support', 'Helps customers: profile edits, password resets, reward adjustments, holds and cancellations.', 'STAFF', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_template_catalog_manager', 'catalog_manager', 'Catalog Manager', 'Owns products, materials, finishing options, rates and promo codes.', 'STAFF', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Seed: default role → permission matrix (plan §3.3 as amended by §11 decision 2).
INSERT INTO "role_permission" ("roleId", "permissionKey") VALUES
  ('role_system_staff', 'orders:read'),
  ('role_system_staff', 'orders:update_status'),
  ('role_system_staff', 'orders:hold'),
  ('role_system_staff', 'orders:cancel'),
  ('role_system_staff', 'orders:dropship'),
  ('role_system_staff', 'orders:tracking'),
  ('role_system_staff', 'orders:note'),
  ('role_system_staff', 'customers:read'),
  ('role_system_staff', 'artwork:read_any'),
  ('role_system_staff', 'rewards:read'),
  ('role_system_staff', 'catalog:read'),
  ('role_system_staff', 'promos:read'),
  ('role_system_content_editor', 'content:read'),
  ('role_system_content_editor', 'content:edit'),
  ('role_system_content_editor', 'content:publish'),
  ('role_template_fulfillment', 'orders:read'),
  ('role_template_fulfillment', 'orders:update_status'),
  ('role_template_fulfillment', 'orders:hold'),
  ('role_template_fulfillment', 'orders:dropship'),
  ('role_template_fulfillment', 'orders:tracking'),
  ('role_template_fulfillment', 'orders:note'),
  ('role_template_fulfillment', 'customers:read'),
  ('role_template_fulfillment', 'artwork:read_any'),
  ('role_template_support', 'orders:read'),
  ('role_template_support', 'orders:hold'),
  ('role_template_support', 'orders:cancel'),
  ('role_template_support', 'orders:note'),
  ('role_template_support', 'customers:read'),
  ('role_template_support', 'customers:update'),
  ('role_template_support', 'customers:reset_password'),
  ('role_template_support', 'artwork:read_any'),
  ('role_template_support', 'rewards:read'),
  ('role_template_support', 'rewards:adjust'),
  ('role_template_support', 'promos:read'),
  ('role_template_catalog_manager', 'catalog:read'),
  ('role_template_catalog_manager', 'catalog:write'),
  ('role_template_catalog_manager', 'pricing:write'),
  ('role_template_catalog_manager', 'promos:read'),
  ('role_template_catalog_manager', 'promos:write')
ON CONFLICT DO NOTHING;

-- Backfill: every existing account gets the system role matching its legacy enum.
UPDATE "user" u
SET "roleId" = r."id"
FROM "access_role" r
WHERE u."roleId" IS NULL
  AND r."isSystem" = true
  AND r."legacyRole" = u."role";
