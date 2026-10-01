/**
 * MSW handlers for the RBAC admin surface (plan §5.2): staff accounts, roles,
 * the permission catalog, per-user overrides, the audit log, invite acceptance
 * and the signed-in password change. Permission checks mirror the backend's
 * PermissionsGuard so the frontend's `useCan` gating can be exercised end to
 * end, including the "403 → revalidate" path.
 *
 * No node-only imports: these run in Vitest and in the browser service worker.
 */

import { http, HttpResponse } from "msw";
import { PERMISSIONS, hasPermission, type PermissionKey, type User } from "@bannersin48/shared";
import { MOCK_PERMISSIONS_KEY, store } from "./fixtures";
import type { AdminRole, AuditEntry, StaffUserDetail, UserPermissionOverride } from "../rbac";

const API = "http://localhost:3001";
const ELEVATED = new Set(PERMISSIONS.filter((p) => p.elevated).map((p) => p.key));
const KNOWN = new Set<string>(PERMISSIONS.map((p) => p.key));

const error = (status: number, code: string, message: string, extra: Record<string, unknown> = {}) =>
  HttpResponse.json({ code, message, ...extra }, { status });

function loginUser(request: Request): User | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer mock-token-")) return null;
  const id = auth.slice("Bearer mock-token-".length);
  for (const { user } of store.users.values()) if (user.id === id) return user;
  return null;
}

/** 401 without a token, 403 PASSWORD_CHANGE_REQUIRED for temp-password accounts, 403 FORBIDDEN_PERMISSION when a key is missing. */
export function requirePermission(request: Request, ...keys: PermissionKey[]): User | Response {
  const user = loginUser(request);
  if (!user) return error(401, "UNAUTHORIZED", "Authentication is required.");
  if (user.mustChangePassword) return error(403, "PASSWORD_CHANGE_REQUIRED", "Set a new password before continuing.");
  const missing = keys.filter((key) => !hasPermission(user.permissions, key));
  if (missing.length > 0) return error(403, "FORBIDDEN_PERMISSION", "You do not have permission to do this.", { required: missing });
  return user;
}

const isWildcard = (user: User) => user.permissions.includes("*");

function effectiveOf(staff: StaffUserDetail): string[] {
  const role = store.roles.find((r) => r.id === staff.roleId);
  if (role?.key === "admin") return ["*"];
  const set = new Set(role?.permissions ?? []);
  const now = Date.now();
  const live = (store.overrides.get(staff.id) ?? []).filter((o) => !o.expiresAt || new Date(o.expiresAt).getTime() > now);
  for (const o of live) if (o.effect === "ALLOW") set.add(o.permissionKey);
  for (const o of live) if (o.effect === "DENY") set.delete(o.permissionKey);
  return [...set].sort();
}

/** Recomputes a directory row's derived fields (role name, effective set, override count). Reads use this. */
function refreshStaff(id: string): StaffUserDetail {
  const staff = store.staff.get(id)!;
  const role = store.roles.find((r) => r.id === staff.roleId);
  staff.roleKey = role?.key ?? null;
  staff.roleName = role?.name ?? null;
  staff.role = (role?.legacyRole as StaffUserDetail["role"]) ?? staff.role;
  staff.permissions = effectiveOf(staff);
  staff.overrideCount = (store.overrides.get(id) ?? []).length;
  return staff;
}

/**
 * Mutations use this: refresh, then mirror into the login record (what
 * `/auth/me` answers). Reads never mirror, so a permission list seeded or
 * changed through the mock hook survives listing the directory.
 */
function syncStaff(id: string): StaffUserDetail {
  const staff = refreshStaff(id);
  for (const record of store.users.values()) {
    if (record.user.id === id) {
      record.user.permissions = [...staff.permissions];
      record.user.roleKey = staff.roleKey;
      record.user.role = staff.role;
      record.user.mustChangePassword = staff.mustChangePassword;
    }
  }
  for (const r of store.roles) r.memberCount = Array.from(store.staff.values()).filter((s) => s.roleId === r.id).length;
  return staff;
}

/** Appends an audit row (newest first), like `AuditService.record`. Shared with the admin-panel handlers. */
export function record(actor: User | null, action: string, entityType: string, entityId: string | null, diff: unknown): void {
  const entry: AuditEntry = {
    id: `al_${store.auditIdCounter++}`,
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action,
    entityType,
    entityId,
    diff,
    ip: "127.0.0.1",
    createdAt: new Date().toISOString(),
  };
  store.audit.unshift(entry);
}

/** Grant ceiling (plan §3.6 rule 1): what the actor does not hold cannot be handed out; elevated keys need rbac:manage. */
function grantCeiling(actor: User, keys: string[]): Response | null {
  if (isWildcard(actor)) return null;
  const missing = keys.filter((k) => !hasPermission(actor.permissions, k));
  const elevated = keys.some((k) => ELEVATED.has(k)) && !hasPermission(actor.permissions, "rbac:manage");
  if (missing.length > 0 || elevated) {
    return error(403, "GRANT_CEILING", "You can only grant permissions you hold yourself; elevated permissions need rbac:manage.", {
      required: [...new Set([...missing, ...(elevated ? ["rbac:manage"] : [])])],
    });
  }
  return null;
}

function revokeSessionsNoop(): void {
  // Mock tokens are stateless; a real backend revokes refresh tokens here.
}

const lastActiveAdmin = (exceptId: string) =>
  Array.from(store.staff.values()).filter((s) => s.id !== exceptId && s.status === "ACTIVE" && s.roleKey === "admin").length === 0;

export const rbacHandlers = [
  // --- Mock-only test hook: change a login user's effective permissions (persists across reloads) ---
  http.post(`${API}/__mock/permissions`, async ({ request }) => {
    const body = (await request.json()) as { userId: string; permissions: string[] };
    for (const record of store.users.values()) if (record.user.id === body.userId) record.user.permissions = body.permissions;
    try {
      const existing = JSON.parse(globalThis.localStorage?.getItem(MOCK_PERMISSIONS_KEY) ?? "{}") as Record<string, string[]>;
      globalThis.localStorage?.setItem(MOCK_PERMISSIONS_KEY, JSON.stringify({ ...existing, [body.userId]: body.permissions }));
    } catch {
      // storage unavailable (node): in-memory change is enough
    }
    return HttpResponse.json({ ok: true });
  }),

  // --- Password change (the one mutation a temp-password account may do) ---
  http.post(`${API}/users/me/password`, async ({ request }) => {
    const user = loginUser(request);
    if (!user) return error(401, "UNAUTHORIZED", "Authentication is required.");
    const body = (await request.json()) as { currentPassword: string; newPassword: string };
    const record = store.users.get(user.email);
    if (!record || record.password !== body.currentPassword) return error(400, "INVALID_CURRENT_PASSWORD", "Your current password is incorrect.");
    if (user.role !== "CUSTOMER" && body.newPassword.length < 12) return error(400, "WEAK_PASSWORD", "Password must be at least 12 characters.");
    if (body.newPassword === body.currentPassword) return error(400, "PASSWORD_REUSED", "Choose a password you have not used before.");
    record.password = body.newPassword;
    user.mustChangePassword = false;
    const staff = store.staff.get(user.id);
    if (staff) {
      staff.mustChangePassword = false;
      staff.passwordChangedAt = new Date().toISOString();
    }
    return HttpResponse.json({ ok: true }, { status: 201 });
  }),

  // --- Invite acceptance (public) ---
  http.post(`${API}/auth/accept-invite`, async ({ request }) => {
    const body = (await request.json()) as { token: string; password: string };
    const userId = store.invites.get(body.token);
    const staff = userId ? store.staff.get(userId) : undefined;
    if (!staff || staff.status !== "INVITED") return error(400, "INVITE_INVALID", "This invite link is invalid or has expired.");
    store.invites.delete(body.token);
    staff.status = "ACTIVE";
    staff.invite = null;
    staff.emailVerifiedAt = new Date().toISOString();
    staff.passwordChangedAt = staff.emailVerifiedAt;
    const user: User = {
      id: staff.id,
      email: staff.email,
      fullName: staff.fullName ?? staff.email,
      taxExempt: false,
      taxExemptApproved: false,
      rewardsPoints: 0,
      savedAddresses: [],
      role: staff.role,
      roleKey: staff.roleKey,
      permissions: effectiveOf(staff),
      mustChangePassword: false,
      createdAt: staff.createdAt,
    };
    store.users.set(staff.email, { user, password: body.password });
    record(user, "user.accept_invite", "user", staff.id, { status: { from: "INVITED", to: "ACTIVE" }, passwordChanged: true });
    return HttpResponse.json({ user, token: `mock-token-${user.id}` }, { status: 201 });
  }),

  // --- Permission catalog ---
  http.get(`${API}/admin/permissions`, ({ request }) => {
    const actor = requirePermission(request, "rbac:read");
    if (actor instanceof Response) return actor;
    return HttpResponse.json(PERMISSIONS.map((p) => ({ key: p.key, resource: p.resource, action: p.action, description: p.description, elevated: p.elevated })));
  }),

  // --- Roles ---
  http.get(`${API}/admin/roles`, ({ request }) => {
    const actor = requirePermission(request, "rbac:read");
    if (actor instanceof Response) return actor;
    return HttpResponse.json(store.roles);
  }),

  http.get(`${API}/admin/roles/:id`, ({ request, params }) => {
    const actor = requirePermission(request, "rbac:read");
    if (actor instanceof Response) return actor;
    const role = store.roles.find((r) => r.id === params.id);
    return role ? HttpResponse.json(role) : error(404, "ROLE_NOT_FOUND", "Role not found.");
  }),

  http.post(`${API}/admin/roles`, async ({ request }) => {
    const actor = requirePermission(request, "rbac:manage");
    if (actor instanceof Response) return actor;
    const body = (await request.json()) as { key: string; name: string; description?: string | null; legacyRole: "STAFF" | "CONTENT_EDITOR"; permissions: string[] };
    const key = body.key.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]{1,39}$/.test(key)) return error(400, "VALIDATION", "Key must be a lowercase slug.");
    if (body.permissions.some((k) => !KNOWN.has(k))) return error(400, "VALIDATION", "Unknown permission key.");
    if (store.roles.some((r) => r.key === key)) return error(409, "ROLE_KEY_TAKEN", `A role with the key "${key}" already exists.`);
    const ceiling = grantCeiling(actor, body.permissions);
    if (ceiling) return ceiling;
    const now = new Date().toISOString();
    const role: AdminRole = {
      id: `role_${key}`,
      key,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      legacyRole: body.legacyRole,
      isSystem: false,
      immutable: false,
      permissions: [...new Set(body.permissions)].sort(),
      memberCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    store.roles.push(role);
    record(actor, "rbac.role.create", "access_role", role.id, { role: { key, name: role.name, legacyRole: role.legacyRole }, permissions: { from: [], to: role.permissions } });
    return HttpResponse.json(role, { status: 201 });
  }),

  http.patch(`${API}/admin/roles/:id`, async ({ request, params }) => {
    const actor = requirePermission(request, "rbac:manage");
    if (actor instanceof Response) return actor;
    const role = store.roles.find((r) => r.id === params.id);
    if (!role) return error(404, "ROLE_NOT_FOUND", "Role not found.");
    if (role.immutable) return error(403, "ROLE_IMMUTABLE", `The ${role.key} role cannot be changed.`);
    const body = (await request.json()) as { name?: string; description?: string | null };
    const before = { name: role.name, description: role.description };
    if (body.name !== undefined) role.name = body.name.trim();
    if (body.description !== undefined) role.description = body.description?.trim() || null;
    role.updatedAt = new Date().toISOString();
    record(actor, "rbac.role.update", "access_role", role.id, { roleKey: role.key, name: { from: before.name, to: role.name }, description: { from: before.description, to: role.description } });
    for (const s of store.staff.values()) if (s.roleId === role.id) syncStaff(s.id);
    return HttpResponse.json(role);
  }),

  http.put(`${API}/admin/roles/:id/permissions`, async ({ request, params }) => {
    const actor = requirePermission(request, "rbac:manage");
    if (actor instanceof Response) return actor;
    const role = store.roles.find((r) => r.id === params.id);
    if (!role) return error(404, "ROLE_NOT_FOUND", "Role not found.");
    if (role.immutable) return error(403, "ROLE_IMMUTABLE", `The ${role.key} role's permissions cannot be changed.`);
    const body = (await request.json()) as { permissions: string[] };
    if (body.permissions.some((k) => !KNOWN.has(k))) return error(400, "VALIDATION", "Unknown permission key.");
    const next = [...new Set(body.permissions)].sort();
    const ceiling = grantCeiling(actor, next.filter((k) => !role.permissions.includes(k)));
    if (ceiling) return ceiling;
    const from = role.permissions;
    role.permissions = next;
    role.updatedAt = new Date().toISOString();
    record(actor, "rbac.role.permissions.set", "access_role", role.id, { roleKey: role.key, permissions: { from, to: next } });
    for (const s of store.staff.values()) if (s.roleId === role.id) syncStaff(s.id);
    return HttpResponse.json({ permissions: next });
  }),

  http.delete(`${API}/admin/roles/:id`, ({ request, params }) => {
    const actor = requirePermission(request, "rbac:manage");
    if (actor instanceof Response) return actor;
    const role = store.roles.find((r) => r.id === params.id);
    if (!role) return error(404, "ROLE_NOT_FOUND", "Role not found.");
    if (role.isSystem) return error(403, "ROLE_IMMUTABLE", "System roles cannot be deleted.");
    if (role.memberCount > 0) return error(409, "ROLE_IN_USE", `${role.memberCount} account(s) still hold this role. Reassign them first.`);
    store.roles = store.roles.filter((r) => r.id !== role.id);
    record(actor, "rbac.role.delete", "access_role", role.id, { role: { key: role.key, name: role.name }, permissions: { from: role.permissions, to: [] } });
    return HttpResponse.json({ deleted: true });
  }),

  // --- Staff accounts ---
  http.get(`${API}/admin/users`, ({ request }) => {
    const actor = requirePermission(request, "users:read");
    if (actor instanceof Response) return actor;
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
    const status = url.searchParams.get("status");
    const roleId = url.searchParams.get("roleId");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 25)));
    const all = Array.from(store.staff.values())
      .map((s) => refreshStaff(s.id))
      .filter((s) => (!status || s.status === status) && (!roleId || s.roleId === roleId))
      .filter((s) => !search || [s.email, s.firstName, s.lastName].some((v) => v?.toLowerCase().includes(search)))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const items = all.slice((page - 1) * pageSize, page * pageSize).map(({ permissions: _p, invite: _i, emailVerifiedAt: _e, passwordChangedAt: _c, ...row }) => row);
    return HttpResponse.json({ page, pageSize, total: all.length, items });
  }),

  http.post(`${API}/admin/users`, async ({ request }) => {
    const actor = requirePermission(request, "users:create");
    if (actor instanceof Response) return actor;
    const body = (await request.json()) as {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      roleId: string;
      mode: "temporary_password" | "invite";
      temporaryPassword?: string;
    };
    const role = store.roles.find((r) => r.id === body.roleId);
    if (!role) return error(404, "ROLE_NOT_FOUND", "Role not found.");
    if (role.key === "customer") return error(400, "ROLE_NOT_STAFF", "Staff accounts need a staff role.");
    if (role.key === "admin" && !hasPermission(actor.permissions, "rbac:manage")) {
      return error(403, "FORBIDDEN_PERMISSION", "Only rbac:manage holders can create admin accounts.", { required: ["rbac:manage"] });
    }
    const ceiling = grantCeiling(actor, role.permissions);
    if (ceiling) return ceiling;
    if (body.mode === "temporary_password") {
      if (!body.temporaryPassword) return error(400, "PASSWORD_REQUIRED", "Set a temporary password.");
      if (body.temporaryPassword.length < 12) return error(400, "WEAK_PASSWORD", "Password must be at least 12 characters.");
      if (body.temporaryPassword.trim() !== body.temporaryPassword) return error(400, "WEAK_PASSWORD", "Password must not start or end with whitespace.");
    }
    const email = body.email.trim().toLowerCase();
    if (store.users.has(email) || Array.from(store.staff.values()).some((s) => s.email === email)) {
      return error(409, "EMAIL_TAKEN", "An account with that email already exists.");
    }
    const now = new Date().toISOString();
    const id = `user_${store.userIdCounter++}`;
    const inviteExpiresAt = body.mode === "invite" ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() : null;
    const staff: StaffUserDetail = {
      id,
      email,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      fullName: `${body.firstName.trim()} ${body.lastName.trim()}`.trim(),
      phone: body.phone?.trim() || null,
      role: role.legacyRole as StaffUserDetail["role"],
      roleId: role.id,
      roleKey: role.key,
      roleName: role.name,
      status: body.mode === "invite" ? "INVITED" : "ACTIVE",
      mustChangePassword: body.mode === "temporary_password",
      overrideCount: 0,
      lastLoginAt: null,
      invitedBy: actor.id,
      suspendedAt: null,
      suspendedReason: null,
      emailVerifiedAt: null,
      passwordChangedAt: null,
      permissions: role.key === "admin" ? ["*"] : [...role.permissions],
      invite: inviteExpiresAt ? { createdAt: now, expiresAt: inviteExpiresAt } : null,
      createdAt: now,
    };
    store.staff.set(id, staff);
    if (body.mode === "temporary_password") {
      store.users.set(email, {
        user: {
          id,
          email,
          fullName: staff.fullName ?? email,
          taxExempt: false,
          taxExemptApproved: false,
          rewardsPoints: 0,
          savedAddresses: [],
          role: staff.role,
          roleKey: staff.roleKey,
          permissions: [...staff.permissions],
          mustChangePassword: true,
          createdAt: now,
        },
        password: body.temporaryPassword!,
      });
    } else {
      store.invites.set(`mock-invite-token-${id}`, id);
    }
    syncStaff(id);
    record(actor, "user.create", "user", id, { email, mode: body.mode, status: staff.status, role: { roleKey: role.key, permissions: role.permissions }, mustChangePassword: staff.mustChangePassword });
    return HttpResponse.json({ user: staff, mode: body.mode, inviteExpiresAt }, { status: 201 });
  }),

  http.get(`${API}/admin/users/:id`, ({ request, params }) => {
    const actor = requirePermission(request, "users:read");
    if (actor instanceof Response) return actor;
    const staff = store.staff.get(String(params.id));
    return staff ? HttpResponse.json(refreshStaff(staff.id)) : error(404, "NOT_FOUND", "Staff account not found.");
  }),

  http.patch(`${API}/admin/users/:id`, async ({ request, params }) => {
    const actor = requirePermission(request, "users:update");
    if (actor instanceof Response) return actor;
    const staff = store.staff.get(String(params.id));
    if (!staff) return error(404, "NOT_FOUND", "Staff account not found.");
    const body = (await request.json()) as { firstName?: string; lastName?: string; phone?: string | null };
    const before = { firstName: staff.firstName, lastName: staff.lastName, phone: staff.phone };
    if (body.firstName !== undefined) staff.firstName = body.firstName.trim();
    if (body.lastName !== undefined) staff.lastName = body.lastName.trim();
    if (body.phone !== undefined) staff.phone = body.phone?.trim() || null;
    staff.fullName = [staff.firstName, staff.lastName].filter(Boolean).join(" ") || null;
    record(actor, "user.update", "user", staff.id, Object.fromEntries(Object.entries(before).filter(([k, v]) => v !== staff[k as keyof typeof before]).map(([k, v]) => [k, { from: v, to: staff[k as keyof typeof before] }])));
    return HttpResponse.json(syncStaff(staff.id));
  }),

  http.post(`${API}/admin/users/:id/invite/resend`, ({ request, params }) => {
    const actor = requirePermission(request, "users:create");
    if (actor instanceof Response) return actor;
    const staff = store.staff.get(String(params.id));
    if (!staff) return error(404, "NOT_FOUND", "Staff account not found.");
    if (staff.status !== "INVITED") return error(409, "NOT_INVITED", "This account has already been activated.");
    const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    staff.invite = { createdAt: new Date().toISOString(), expiresAt: inviteExpiresAt };
    store.invites.set(`mock-invite-token-${staff.id}`, staff.id);
    record(actor, "user.invite_resend", "user", staff.id, { expiresAt: inviteExpiresAt });
    return HttpResponse.json({ ok: true, inviteExpiresAt }, { status: 201 });
  }),

  http.post(`${API}/admin/users/:id/role`, async ({ request, params }) => {
    const actor = requirePermission(request, "users:update");
    if (actor instanceof Response) return actor;
    const staff = store.staff.get(String(params.id));
    if (!staff) return error(404, "NOT_FOUND", "Staff account not found.");
    if (staff.id === actor.id) return error(403, "SELF_MODIFICATION", "You cannot change your own access.");
    const body = (await request.json()) as { roleId: string };
    const role = store.roles.find((r) => r.id === body.roleId);
    if (!role) return error(404, "ROLE_NOT_FOUND", "Role not found.");
    if (role.key === "admin" && !hasPermission(actor.permissions, "rbac:manage")) {
      return error(403, "FORBIDDEN_PERMISSION", "Only rbac:manage holders can assign the admin role.", { required: ["rbac:manage"] });
    }
    const ceiling = grantCeiling(actor, role.permissions);
    if (ceiling) return ceiling;
    if (staff.roleKey === "admin" && role.key !== "admin" && lastActiveAdmin(staff.id)) {
      return error(409, "LAST_ADMIN", "There must always be at least one active admin.");
    }
    const from = { roleKey: staff.roleKey, permissions: staff.permissions };
    staff.roleId = role.id;
    revokeSessionsNoop();
    const after = syncStaff(staff.id);
    record(actor, "rbac.user.role.assign", "user", staff.id, { from, to: { roleKey: after.roleKey, permissions: after.permissions } });
    return HttpResponse.json(after, { status: 201 });
  }),

  http.post(`${API}/admin/users/:id/suspend`, async ({ request, params }) => {
    const actor = requirePermission(request, "users:suspend");
    if (actor instanceof Response) return actor;
    const staff = store.staff.get(String(params.id));
    if (!staff) return error(404, "NOT_FOUND", "Staff account not found.");
    if (staff.id === actor.id) return error(403, "SELF_MODIFICATION", "You cannot change your own access.");
    if (staff.status === "SUSPENDED") return error(409, "ALREADY_SUSPENDED", "This account is already suspended.");
    if (staff.roleKey === "admin" && lastActiveAdmin(staff.id)) return error(409, "LAST_ADMIN", "There must always be at least one active admin.");
    const body = (await request.json()) as { reason: string };
    const from = staff.status;
    staff.status = "SUSPENDED";
    staff.suspendedAt = new Date().toISOString();
    staff.suspendedReason = body.reason.trim();
    revokeSessionsNoop();
    record(actor, "user.suspend", "user", staff.id, { status: { from, to: "SUSPENDED" }, reason: staff.suspendedReason });
    return HttpResponse.json(syncStaff(staff.id), { status: 201 });
  }),

  http.post(`${API}/admin/users/:id/reactivate`, async ({ request, params }) => {
    const actor = requirePermission(request, "users:suspend");
    if (actor instanceof Response) return actor;
    const staff = store.staff.get(String(params.id));
    if (!staff) return error(404, "NOT_FOUND", "Staff account not found.");
    if (staff.status !== "SUSPENDED") return error(409, "NOT_SUSPENDED", "This account is not suspended.");
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const previousReason = staff.suspendedReason;
    staff.status = "ACTIVE";
    staff.suspendedAt = null;
    staff.suspendedReason = null;
    record(actor, "user.reactivate", "user", staff.id, { status: { from: "SUSPENDED", to: "ACTIVE" }, previousReason, reason: body.reason ?? null });
    return HttpResponse.json(syncStaff(staff.id), { status: 201 });
  }),

  http.post(`${API}/admin/users/:id/reset-password`, ({ request, params }) => {
    const actor = requirePermission(request, "users:reset_password");
    if (actor instanceof Response) return actor;
    const staff = store.staff.get(String(params.id));
    if (!staff) return error(404, "NOT_FOUND", "Staff account not found.");
    if (staff.roleKey === "admin" && staff.id !== actor.id) {
      return error(403, "FORBIDDEN_TARGET", "Admin passwords can't be reset from the dashboard. Use the server reset-password script.");
    }
    record(actor, "customer.admin_password_reset", "user", staff.id, { requestedBy: { from: null, to: actor.id }, targetRole: staff.role });
    return HttpResponse.json({ ok: true }, { status: 201 });
  }),

  // --- Per-user overrides ---
  http.get(`${API}/admin/users/:id/permissions`, ({ request, params }) => {
    const actor = requirePermission(request, "rbac:read");
    if (actor instanceof Response) return actor;
    const staff = store.staff.get(String(params.id));
    if (!staff) return error(404, "NOT_FOUND", "User not found.");
    const role = store.roles.find((r) => r.id === staff.roleId);
    return HttpResponse.json({
      roleKey: staff.roleKey,
      rolePermissions: role?.permissions ?? [],
      overrides: store.overrides.get(staff.id) ?? [],
      effective: effectiveOf(staff),
    });
  }),

  http.put(`${API}/admin/users/:id/permissions/:key`, async ({ request, params }) => {
    const actor = requirePermission(request, "rbac:manage");
    if (actor instanceof Response) return actor;
    const staff = store.staff.get(String(params.id));
    if (!staff) return error(404, "NOT_FOUND", "User not found.");
    const key = String(params.key);
    if (!KNOWN.has(key)) return error(400, "UNKNOWN_PERMISSION", `Unknown permission "${key}".`);
    if (staff.id === actor.id) return error(403, "SELF_MODIFICATION", "You cannot change your own access.");
    if (staff.roleKey === "admin") return error(403, "ROLE_IMMUTABLE", "The admin role holds every permission; overrides do not apply.");
    const body = (await request.json()) as { effect: "ALLOW" | "DENY"; reason?: string | null; expiresAt?: string | null };
    if (body.effect === "ALLOW") {
      const ceiling = grantCeiling(actor, [key]);
      if (ceiling) return ceiling;
    }
    if (body.expiresAt && new Date(body.expiresAt).getTime() <= Date.now()) return error(400, "EXPIRY_IN_PAST", "Expiry must be in the future.");
    const before = effectiveOf(staff);
    const list = (store.overrides.get(staff.id) ?? []).filter((o) => o.permissionKey !== key);
    const override: UserPermissionOverride = { permissionKey: key, effect: body.effect, reason: body.reason ?? null, grantedBy: actor.id, expiresAt: body.expiresAt ?? null, createdAt: new Date().toISOString() };
    store.overrides.set(staff.id, [...list, override]);
    revokeSessionsNoop();
    const after = syncStaff(staff.id);
    record(actor, "rbac.user.permission.set", "user", staff.id, { override, permissions: { from: before, to: after.permissions } });
    return HttpResponse.json({ permissions: after.permissions });
  }),

  http.delete(`${API}/admin/users/:id/permissions/:key`, ({ request, params }) => {
    const actor = requirePermission(request, "rbac:manage");
    if (actor instanceof Response) return actor;
    const staff = store.staff.get(String(params.id));
    if (!staff) return error(404, "NOT_FOUND", "User not found.");
    if (staff.id === actor.id) return error(403, "SELF_MODIFICATION", "You cannot change your own access.");
    const key = String(params.key);
    const before = effectiveOf(staff);
    store.overrides.set(staff.id, (store.overrides.get(staff.id) ?? []).filter((o) => o.permissionKey !== key));
    const after = syncStaff(staff.id);
    record(actor, "rbac.user.permission.clear", "user", staff.id, { permissionKey: key, permissions: { from: before, to: after.permissions } });
    return HttpResponse.json({ permissions: after.permissions });
  }),

  // --- Audit log ---
  http.get(`${API}/admin/audit/actions`, ({ request }) => {
    const actor = requirePermission(request, "audit:read");
    if (actor instanceof Response) return actor;
    return HttpResponse.json([...new Set(store.audit.map((a) => a.action))].sort());
  }),

  http.get(`${API}/admin/audit`, ({ request }) => {
    const actor = requirePermission(request, "audit:read");
    if (actor instanceof Response) return actor;
    const url = new URL(request.url);
    const get = (k: string) => url.searchParams.get(k) || undefined;
    const from = get("from") ? new Date(get("from")!).getTime() : undefined;
    const to = get("to") ? new Date(get("to")!).getTime() : undefined;
    const page = Math.max(1, Number(get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(get("pageSize") ?? 50)));
    const all = store.audit.filter((a) => {
      const t = new Date(a.createdAt).getTime();
      return (
        (!get("actorId") || a.actorId === get("actorId")) &&
        (!get("action") || a.action === get("action")) &&
        (!get("entityType") || a.entityType === get("entityType")) &&
        (!get("entityId") || a.entityId === get("entityId")) &&
        (from === undefined || t >= from) &&
        (to === undefined || t <= to)
      );
    });
    return HttpResponse.json({ page, pageSize, total: all.length, items: all.slice((page - 1) * pageSize, page * pageSize) });
  }),
];
