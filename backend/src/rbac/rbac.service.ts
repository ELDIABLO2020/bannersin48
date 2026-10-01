import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { syncRbacCatalog } from "./catalog-sync";
import {
  ADMIN_ROLE_KEY,
  ADMIN_WILDCARD,
  CUSTOMER_ROLE_KEY,
  can,
  isElevated,
  resolveEffective,
  roleKeyOf,
  toWirePermissions,
  type EffectivePermissions,
  type PermissionKey,
  type RbacUserShape,
} from "./permissions";

/** Prisma `include` that loads what `resolveEffective` needs, with expired overrides filtered out. */
export function rbacUserInclude(now: Date = new Date()) {
  return {
    accessRole: { include: { permissions: { select: { permissionKey: true } } } },
    permissionOverrides: { where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } },
  } satisfies Prisma.UserInclude;
}

type Actor = Pick<AuthedUser, "id" | "permissions">;
type TargetUser = RbacUserShape & { id: string; email: string; role: string; status: string; roleId: string };

export type { EffectivePermissions };

/** Wire shape of an access role (`GET /admin/roles`). `permissions` is `[]` for `admin`, which holds the wildcard. */
export interface RoleSummary {
  id: string;
  key: string;
  name: string;
  description: string | null;
  legacyRole: string;
  isSystem: boolean;
  /** `admin` and `customer`: permission set and metadata cannot change. */
  immutable: boolean;
  permissions: string[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Everything that feeds one user's effective set (`GET /admin/users/:id/permissions`). */
export interface UserPermissionBreakdown {
  roleKey: string | null;
  rolePermissions: string[];
  overrides: Array<{
    permissionKey: string;
    effect: "ALLOW" | "DENY";
    reason: string | null;
    grantedBy: string | null;
    expiresAt: string | null;
    createdAt: string;
  }>;
  effective: string[];
}

export interface CreateRoleInput {
  key: string;
  name: string;
  description?: string | null;
  legacyRole: "STAFF" | "CONTENT_EDITOR";
  permissions: readonly PermissionKey[];
}

type RoleRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  legacyRole: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: ReadonlyArray<{ permissionKey: string }>;
  _count: { users: number };
};

const ROLE_INCLUDE = { permissions: { select: { permissionKey: true } }, _count: { select: { users: true } } } satisfies Prisma.AccessRoleInclude;

function serializeRole(role: RoleRow): RoleSummary {
  return {
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    legacyRole: role.legacyRole,
    isSystem: role.isSystem,
    immutable: role.key === ADMIN_ROLE_KEY || role.key === CUSTOMER_ROLE_KEY,
    permissions: role.permissions.map((p) => p.permissionKey).sort(),
    memberCount: role._count.users,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

/**
 * Role + permission resolution and every mutation that changes who holds what.
 * Escalation safeguards (plan §3.6) live here, not in controllers, so they are
 * enforced the same way for every caller. Mutations audit inside their transaction.
 */
@Injectable()
export class RbacService implements OnModuleInit {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Upserts the code-defined catalog and seeds any missing system/template roles. */
  async onModuleInit(): Promise<void> {
    const result = await this.syncCatalog();
    if (result.newPermissionKeys.length > 0 || result.createdRoles.length > 0) {
      this.logger.log(
        `RBAC catalog synced: ${result.newPermissionKeys.length} new permission(s), ${result.createdRoles.length} role(s) created.`,
      );
    }
  }

  syncCatalog() {
    return syncRbacCatalog(this.prisma);
  }

  // --- Resolution -----------------------------------------------------------

  resolveEffective(user: RbacUserShape, now: Date = new Date()): EffectivePermissions {
    return resolveEffective(user, now);
  }

  /** `{ roleKey, permissions }` for the wire shape and for object-level checks. */
  async loadAccess(userId: string): Promise<{ roleKey: string | null; permissions: EffectivePermissions }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: rbacUserInclude() });
    if (!user) throw new NotFoundException({ code: "NOT_FOUND", message: "User not found." });
    return { roleKey: roleKeyOf(user), permissions: resolveEffective(user) };
  }

  // --- Safeguards (plan §3.6) -------------------------------------------------

  /** Rule 3: nobody changes their own role, overrides or status. */
  assertNotSelf(actor: Pick<AuthedUser, "id">, targetUserId: string): void {
    if (actor.id === targetUserId) {
      throw new ForbiddenException({ code: "SELF_MODIFICATION", message: "You cannot change your own access." });
    }
  }

  /**
   * Rule 1: an actor may only hand out permissions they hold themselves, and
   * elevated permissions additionally require `rbac:manage`.
   */
  assertCanGrant(actor: Actor, keys: readonly PermissionKey[]): void {
    if (actor.permissions === ADMIN_WILDCARD) return;
    const missing = keys.filter((key) => !can(actor, key));
    const elevated = keys.filter((key) => isElevated(key));
    if (missing.length > 0 || (elevated.length > 0 && !can(actor, "rbac:manage"))) {
      throw new ForbiddenException({
        code: "GRANT_CEILING",
        message: "You can only grant permissions you hold yourself; elevated permissions need rbac:manage.",
        required: [...new Set([...missing, ...(elevated.length > 0 ? ["rbac:manage" as const] : [])])],
      });
    }
  }

  /**
   * Rule 4: the last ACTIVE admin cannot be demoted, suspended or stripped of
   * access. Only the access role counts: `user.roleId` is NOT NULL since phase 5,
   * so the legacy `role` enum is never consulted here.
   */
  async assertNotLastAdmin(targetUserId: string, tx: Prisma.TransactionClient | PrismaService = this.prisma): Promise<void> {
    const others = await tx.user.count({
      where: {
        id: { not: targetUserId },
        status: "ACTIVE",
        accessRole: { key: ADMIN_ROLE_KEY },
      },
    });
    if (others === 0) {
      throw new ConflictException({ code: "LAST_ADMIN", message: "There must always be at least one active admin." });
    }
  }

  /**
   * Rule 5: `customers:*` actions apply to CUSTOMER-kind accounts, `users:*` to
   * staff-kind accounts. `kind` is which family the caller is acting under.
   */
  assertTargetKind(target: Pick<TargetUser, "role">, kind: "customer" | "staff"): void {
    const isCustomer = target.role === "CUSTOMER";
    if ((kind === "customer") !== isCustomer) {
      throw new ForbiddenException({
        code: "FORBIDDEN_TARGET",
        message: isCustomer ? "This action applies to staff accounts only." : "This action applies to customer accounts only.",
      });
    }
  }

  /**
   * Admin-initiated password reset (replaces the old `assertMayReset`):
   * customers need `customers:reset_password`, staff need `users:reset_password`,
   * and another admin's password stays CLI-only (rule 5).
   */
  assertMayResetPassword(actor: Actor, target: Pick<TargetUser, "id" | "role"> & Partial<Pick<TargetUser, "accessRole">>): void {
    const targetRoleKey = target.accessRole?.key ?? (target.role === "ADMIN" ? ADMIN_ROLE_KEY : null);
    if (targetRoleKey === ADMIN_ROLE_KEY && target.id !== actor.id) {
      throw new ForbiddenException({
        code: "FORBIDDEN_TARGET",
        message: "Admin passwords can't be reset from the dashboard. Use the server reset-password script.",
      });
    }
    const required: PermissionKey = target.role === "CUSTOMER" ? "customers:reset_password" : "users:reset_password";
    if (!can(actor, required)) {
      throw new ForbiddenException({
        code: "FORBIDDEN_PERMISSION",
        message:
          target.role === "CUSTOMER"
            ? "You do not have permission to reset customer passwords."
            : "Only staff with users:reset_password can reset a staff account's password.",
        required: [required],
      });
    }
  }

  // --- Mutations (all audited inside the transaction) ---------------------------

  /**
   * Assigns a primary role. Syncs the legacy `User.role` (rule 6), revokes every
   * refresh token (rule 7), applies the grant ceiling, the admin-role rule, the
   * self rule and the last-admin lock.
   */
  async assignRole(actor: Actor, targetUserId: string, roleId: string, ip?: string): Promise<{ roleKey: string; permissions: string[] }> {
    this.assertNotSelf(actor, targetUserId);
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, include: rbacUserInclude() });
    if (!target) throw new NotFoundException({ code: "NOT_FOUND", message: "User not found." });

    const role = await this.prisma.accessRole.findUnique({
      where: { id: roleId },
      include: { permissions: { select: { permissionKey: true } } },
    });
    if (!role) throw new NotFoundException({ code: "ROLE_NOT_FOUND", message: "Role not found." });

    if (role.key === ADMIN_ROLE_KEY && !can(actor, "rbac:manage")) {
      throw new ForbiddenException({
        code: "FORBIDDEN_PERMISSION",
        message: "Only rbac:manage holders can assign the admin role.",
        required: ["rbac:manage"],
      });
    }
    this.assertCanGrant(actor, role.permissions.map((p) => p.permissionKey as PermissionKey));

    const before = { roleKey: roleKeyOf(target), role: target.role, permissions: toWirePermissions(resolveEffective(target)) };
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (before.roleKey === ADMIN_ROLE_KEY && role.key !== ADMIN_ROLE_KEY) {
        await this.assertNotLastAdmin(targetUserId, tx);
      }
      await tx.user.update({ where: { id: targetUserId }, data: { roleId: role.id, role: role.legacyRole } });
      await tx.refreshToken.updateMany({ where: { userId: targetUserId, revokedAt: null }, data: { revokedAt: now } });
      const after = await tx.user.findUniqueOrThrow({ where: { id: targetUserId }, include: rbacUserInclude(now) });
      await this.audit.record(
        {
          actorId: actor.id,
          action: "rbac.user.role.assign",
          entityType: "user",
          entityId: targetUserId,
          diff: { from: before, to: { roleKey: role.key, role: role.legacyRole, permissions: toWirePermissions(resolveEffective(after, now)) } },
          ip,
        },
        tx,
      );
    });

    const access = await this.loadAccess(targetUserId);
    return { roleKey: role.key, permissions: toWirePermissions(access.permissions) };
  }

  /** Upserts a per-user ALLOW/DENY override. Admins ignore overrides, so none are stored for them. */
  async setOverride(
    actor: Actor,
    targetUserId: string,
    input: { permissionKey: PermissionKey; effect: "ALLOW" | "DENY"; reason?: string | null; expiresAt?: Date | null },
    ip?: string,
  ): Promise<{ permissions: string[] }> {
    this.assertNotSelf(actor, targetUserId);
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, include: rbacUserInclude() });
    if (!target) throw new NotFoundException({ code: "NOT_FOUND", message: "User not found." });
    this.assertOverridable(target);
    if (input.effect === "ALLOW") this.assertCanGrant(actor, [input.permissionKey]);

    const before = toWirePermissions(resolveEffective(target));
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.userPermission.upsert({
        where: { userId_permissionKey: { userId: targetUserId, permissionKey: input.permissionKey } },
        update: { effect: input.effect, reason: input.reason ?? null, expiresAt: input.expiresAt ?? null, grantedBy: actor.id },
        create: {
          userId: targetUserId,
          permissionKey: input.permissionKey,
          effect: input.effect,
          reason: input.reason ?? null,
          expiresAt: input.expiresAt ?? null,
          grantedBy: actor.id,
        },
      });
      await tx.refreshToken.updateMany({ where: { userId: targetUserId, revokedAt: null }, data: { revokedAt: now } });
      const after = await tx.user.findUniqueOrThrow({ where: { id: targetUserId }, include: rbacUserInclude(now) });
      await this.audit.record(
        {
          actorId: actor.id,
          action: "rbac.user.permission.set",
          entityType: "user",
          entityId: targetUserId,
          diff: { override: { ...input, expiresAt: input.expiresAt?.toISOString() ?? null }, permissions: { from: before, to: toWirePermissions(resolveEffective(after, now)) } },
          ip,
        },
        tx,
      );
    });
    return { permissions: toWirePermissions((await this.loadAccess(targetUserId)).permissions) };
  }

  async clearOverride(actor: Actor, targetUserId: string, permissionKey: PermissionKey, ip?: string): Promise<{ permissions: string[] }> {
    this.assertNotSelf(actor, targetUserId);
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, include: rbacUserInclude() });
    if (!target) throw new NotFoundException({ code: "NOT_FOUND", message: "User not found." });

    const before = toWirePermissions(resolveEffective(target));
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId: targetUserId, permissionKey } });
      await tx.refreshToken.updateMany({ where: { userId: targetUserId, revokedAt: null }, data: { revokedAt: now } });
      const after = await tx.user.findUniqueOrThrow({ where: { id: targetUserId }, include: rbacUserInclude(now) });
      await this.audit.record(
        {
          actorId: actor.id,
          action: "rbac.user.permission.clear",
          entityType: "user",
          entityId: targetUserId,
          diff: { permissionKey, permissions: { from: before, to: toWirePermissions(resolveEffective(after, now)) } },
          ip,
        },
        tx,
      );
    });
    return { permissions: toWirePermissions((await this.loadAccess(targetUserId)).permissions) };
  }

  /** Replaces a role's permission set. `admin` and `customer` are immutable (rule 2). */
  async setRolePermissions(actor: Actor, roleId: string, keys: readonly PermissionKey[], ip?: string): Promise<{ permissions: string[] }> {
    const role = await this.prisma.accessRole.findUnique({
      where: { id: roleId },
      include: { permissions: { select: { permissionKey: true } } },
    });
    if (!role) throw new NotFoundException({ code: "ROLE_NOT_FOUND", message: "Role not found." });
    if (role.key === ADMIN_ROLE_KEY || role.key === CUSTOMER_ROLE_KEY) {
      throw new ForbiddenException({ code: "ROLE_IMMUTABLE", message: `The ${role.key} role's permissions cannot be changed.` });
    }
    const next = [...new Set(keys)].sort();
    const before = role.permissions.map((p) => p.permissionKey).sort();
    // Ceiling applies to what is being added; removing is always allowed.
    this.assertCanGrant(actor, next.filter((key) => !before.includes(key)));

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId, permissionKey: { notIn: next } } });
      await tx.rolePermission.createMany({
        data: next.map((permissionKey) => ({ roleId, permissionKey, createdBy: actor.id })),
        skipDuplicates: true,
      });
      // Members' sessions end so a narrowed role takes effect at the next sign-in, not just the next request.
      await tx.refreshToken.updateMany({ where: { user: { roleId }, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.record(
        {
          actorId: actor.id,
          action: "rbac.role.permissions.set",
          entityType: "access_role",
          entityId: roleId,
          diff: { roleKey: role.key, permissions: { from: before, to: next } },
          ip,
        },
        tx,
      );
    });
    return { permissions: next };
  }

  // --- Roles (plan §5.2: /admin/roles*) ----------------------------------------------

  async listRoles(): Promise<RoleSummary[]> {
    const roles = await this.prisma.accessRole.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }], include: ROLE_INCLUDE });
    return roles.map(serializeRole);
  }

  async getRole(roleId: string): Promise<RoleSummary> {
    const role = await this.prisma.accessRole.findUnique({ where: { id: roleId }, include: ROLE_INCLUDE });
    if (!role) throw new NotFoundException({ code: "ROLE_NOT_FOUND", message: "Role not found." });
    return serializeRole(role);
  }

  /** Custom roles only map to STAFF or CONTENT_EDITOR; the grant ceiling applies to the initial set. */
  async createRole(actor: Actor, input: CreateRoleInput, ip?: string): Promise<RoleSummary> {
    const key = input.key.trim().toLowerCase();
    const permissions = [...new Set(input.permissions)].sort();
    this.assertCanGrant(actor, permissions);
    const taken = await this.prisma.accessRole.findUnique({ where: { key }, select: { id: true } });
    if (taken) throw new ConflictException({ code: "ROLE_KEY_TAKEN", message: `A role with the key "${key}" already exists.` });

    const created = await this.prisma.$transaction(async (tx) => {
      const role = await tx.accessRole.create({
        data: { key, name: input.name.trim(), description: input.description?.trim() || null, legacyRole: input.legacyRole, isSystem: false },
        select: { id: true },
      });
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({ data: permissions.map((permissionKey) => ({ roleId: role.id, permissionKey, createdBy: actor.id })), skipDuplicates: true });
      }
      await this.audit.record(
        {
          actorId: actor.id,
          action: "rbac.role.create",
          entityType: "access_role",
          entityId: role.id,
          diff: { role: { key, name: input.name.trim(), legacyRole: input.legacyRole }, permissions: { from: [], to: permissions } },
          ip,
        },
        tx,
      );
      return role;
    });
    return this.getRole(created.id);
  }

  /** Name/description only; the permission set has its own endpoint. `admin` and `customer` are immutable. */
  async updateRole(actor: Actor, roleId: string, patch: { name?: string; description?: string | null }, ip?: string): Promise<RoleSummary> {
    const role = await this.prisma.accessRole.findUnique({ where: { id: roleId }, include: ROLE_INCLUDE });
    if (!role) throw new NotFoundException({ code: "ROLE_NOT_FOUND", message: "Role not found." });
    if (role.key === ADMIN_ROLE_KEY || role.key === CUSTOMER_ROLE_KEY) {
      throw new ForbiddenException({ code: "ROLE_IMMUTABLE", message: `The ${role.key} role cannot be changed.` });
    }
    const data = {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description?.trim() || null } : {}),
    };
    const diff = AuditService.diffOf({ name: role.name, description: role.description }, { name: data.name ?? role.name, description: "description" in data ? data.description : role.description });

    await this.prisma.$transaction(async (tx) => {
      await tx.accessRole.update({ where: { id: roleId }, data });
      await this.audit.record({ actorId: actor.id, action: "rbac.role.update", entityType: "access_role", entityId: roleId, diff: { roleKey: role.key, ...diff }, ip }, tx);
    });
    return this.getRole(roleId);
  }

  /** Custom roles only, and only while nobody holds them (`409 ROLE_IN_USE`). */
  async deleteRole(actor: Actor, roleId: string, ip?: string): Promise<{ deleted: true }> {
    const role = await this.prisma.accessRole.findUnique({ where: { id: roleId }, include: ROLE_INCLUDE });
    if (!role) throw new NotFoundException({ code: "ROLE_NOT_FOUND", message: "Role not found." });
    if (role.isSystem) throw new ForbiddenException({ code: "ROLE_IMMUTABLE", message: "System roles cannot be deleted." });
    if (role._count.users > 0) {
      throw new ConflictException({ code: "ROLE_IN_USE", message: `${role._count.users} account(s) still hold this role. Reassign them first.` });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.actionToken.updateMany({ where: { roleId }, data: { roleId: null } });
      await tx.accessRole.delete({ where: { id: roleId } });
      await this.audit.record(
        {
          actorId: actor.id,
          action: "rbac.role.delete",
          entityType: "access_role",
          entityId: roleId,
          diff: { role: { key: role.key, name: role.name, legacyRole: role.legacyRole }, permissions: { from: role.permissions.map((p) => p.permissionKey).sort(), to: [] } },
          ip,
        },
        tx,
      );
    });
    return { deleted: true };
  }

  /** Role set, live overrides and the resolved result, so the UI never has to recompute the rule. */
  async userPermissions(userId: string): Promise<UserPermissionBreakdown> {
    const now = new Date();
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: rbacUserInclude(now) });
    if (!user) throw new NotFoundException({ code: "NOT_FOUND", message: "User not found." });
    const overrides = user.permissionOverrides as ReadonlyArray<{
      permissionKey: string;
      effect: "ALLOW" | "DENY";
      reason?: string | null;
      grantedBy?: string | null;
      expiresAt: Date | null;
      createdAt?: Date;
    }>;
    return {
      roleKey: roleKeyOf(user),
      rolePermissions: (user.accessRole?.permissions ?? []).map((p) => p.permissionKey).sort(),
      overrides: overrides.map((o) => ({
        permissionKey: o.permissionKey,
        effect: o.effect,
        reason: o.reason ?? null,
        grantedBy: o.grantedBy ?? null,
        expiresAt: o.expiresAt?.toISOString() ?? null,
        createdAt: o.createdAt?.toISOString() ?? now.toISOString(),
      })),
      effective: toWirePermissions(resolveEffective(user, now)),
    };
  }

  private assertOverridable(target: Pick<TargetUser, "role"> & Partial<Pick<TargetUser, "accessRole">>): void {
    const key = target.accessRole?.key ?? (target.role === "ADMIN" ? ADMIN_ROLE_KEY : null);
    if (key === ADMIN_ROLE_KEY) {
      throw new ForbiddenException({ code: "ROLE_IMMUTABLE", message: "The admin role holds every permission; overrides do not apply." });
    }
  }
}
