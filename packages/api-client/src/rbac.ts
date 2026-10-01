/**
 * RBAC admin wire types — roles, the permission catalog, staff accounts,
 * per-user overrides and the audit log (plan §5.2). Mirrors
 * backend/src/rbac/rbac.service.ts, admin/staff-admin.service.ts and
 * admin/audit-admin.service.ts; field names must not drift.
 */

import type { PermissionKey } from "@bannersin48/shared";

export type PermissionEffect = "ALLOW" | "DENY";
export type StaffStatus = "ACTIVE" | "SUSPENDED" | "INVITED";
export type StaffLegacyRole = "STAFF" | "ADMIN" | "CONTENT_EDITOR";

/** `GET /admin/permissions` */
export interface PermissionCatalogEntry {
  key: PermissionKey;
  resource: string;
  action: string;
  description: string;
  /** Only `rbac:manage` holders may grant it. */
  elevated: boolean;
}

/** `GET /admin/roles[/:id]` */
export interface AdminRole {
  id: string;
  key: string;
  name: string;
  description: string | null;
  legacyRole: StaffLegacyRole | "CUSTOMER";
  isSystem: boolean;
  /** `admin` (wildcard) and `customer` (always empty): nothing about them can change. */
  immutable: boolean;
  /** Sorted keys; `[]` for `admin`, which holds `*`. */
  permissions: string[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  key: string;
  name: string;
  description?: string | null;
  legacyRole: "STAFF" | "CONTENT_EDITOR";
  permissions: PermissionKey[];
}

/** `GET /admin/users` row */
export interface StaffUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  phone: string | null;
  role: StaffLegacyRole;
  roleId: string | null;
  roleKey: string | null;
  roleName: string | null;
  status: StaffStatus;
  mustChangePassword: boolean;
  overrideCount: number;
  lastLoginAt: string | null;
  invitedBy: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
}

/** `GET /admin/users/:id` */
export interface StaffUserDetail extends StaffUser {
  emailVerifiedAt: string | null;
  passwordChangedAt: string | null;
  /** Effective permissions (`["*"]` for admin). */
  permissions: string[];
  invite: { expiresAt: string; createdAt: string } | null;
}

export type CreateStaffInput =
  | { email: string; firstName: string; lastName: string; phone?: string; roleId: string; mode: "temporary_password"; temporaryPassword: string }
  | { email: string; firstName: string; lastName: string; phone?: string; roleId: string; mode: "invite" };

export interface CreateStaffResponse {
  user: StaffUserDetail;
  mode: "temporary_password" | "invite";
  inviteExpiresAt: string | null;
}

export interface UserPermissionOverride {
  permissionKey: string;
  effect: PermissionEffect;
  reason: string | null;
  grantedBy: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/** `GET /admin/users/:id/permissions` */
export interface UserPermissionBreakdown {
  roleKey: string | null;
  rolePermissions: string[];
  overrides: UserPermissionOverride[];
  effective: string[];
}

export interface SetOverrideInput {
  effect: PermissionEffect;
  reason?: string | null;
  /** ISO instant; omit for no expiry. */
  expiresAt?: string | null;
}

/** `GET /admin/audit` row */
export interface AuditEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  diff: unknown;
  ip: string | null;
  createdAt: string;
}

export interface AuditQuery {
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}
