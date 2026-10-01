import type { PrismaClient } from "@prisma/client";
import { PERMISSIONS, SYSTEM_ROLES, SYSTEM_ROLE_DEFAULTS, TEMPLATE_ROLE_DEFAULTS } from "./permissions";

export type CatalogSyncClient = Pick<PrismaClient, "permission" | "accessRole" | "rolePermission">;

export interface CatalogSyncResult {
  newPermissionKeys: string[];
  createdRoles: string[];
}

/**
 * Boot-time catalog sync (plan §6.1). DML only: the API connects as a role
 * without DDL rights. Idempotent.
 *
 * - Upserts every `PERMISSIONS` entry (description, elevated flag and sort may
 *   change; keys are stable). Removing a key is a migration, not a sync.
 * - Creates any missing system role with its full default set.
 * - For system roles that already exist, adds only permissions that are *new to
 *   the catalog* since the last sync; it never re-adds a default an admin pruned
 *   on purpose, and never removes anything.
 * - Creates missing custom role templates (editable, deletable; never re-synced).
 */
export async function syncRbacCatalog(prisma: CatalogSyncClient): Promise<CatalogSyncResult> {
  const existing = new Set((await prisma.permission.findMany({ select: { key: true } })).map((p) => p.key));
  const newPermissionKeys: string[] = [];

  for (const [sort, p] of PERMISSIONS.entries()) {
    const fields = { resource: p.resource, action: p.action, description: p.description, elevated: p.elevated, sort };
    await prisma.permission.upsert({ where: { key: p.key }, update: fields, create: { key: p.key, ...fields } });
    if (!existing.has(p.key)) newPermissionKeys.push(p.key);
  }

  const createdRoles: string[] = [];
  for (const role of SYSTEM_ROLES) {
    const defaults = SYSTEM_ROLE_DEFAULTS[role.key];
    const row = await prisma.accessRole.findUnique({ where: { key: role.key }, select: { id: true } });
    if (!row) {
      const created = await prisma.accessRole.create({
        data: { key: role.key, name: role.name, description: role.description, legacyRole: role.legacyRole, isSystem: true },
        select: { id: true },
      });
      createdRoles.push(role.key);
      await grant(prisma, created.id, defaults);
      continue;
    }
    await grant(
      prisma,
      row.id,
      defaults.filter((key) => newPermissionKeys.includes(key)),
    );
  }

  for (const tpl of TEMPLATE_ROLE_DEFAULTS) {
    const row = await prisma.accessRole.findUnique({ where: { key: tpl.key }, select: { id: true } });
    if (row) continue;
    const created = await prisma.accessRole.create({
      data: { key: tpl.key, name: tpl.name, description: tpl.description, legacyRole: tpl.legacyRole, isSystem: false },
      select: { id: true },
    });
    createdRoles.push(tpl.key);
    await grant(prisma, created.id, tpl.permissions);
  }

  return { newPermissionKeys, createdRoles };
}

async function grant(prisma: CatalogSyncClient, roleId: string, keys: readonly string[]): Promise<void> {
  if (keys.length === 0) return;
  await prisma.rolePermission.createMany({
    data: keys.map((permissionKey) => ({ roleId, permissionKey })),
    skipDuplicates: true,
  });
}
