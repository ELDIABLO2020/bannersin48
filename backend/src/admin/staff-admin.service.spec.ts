import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
import { StaffAdminService } from "./staff-admin.service";
import { AdminCustomersService } from "./customers-admin.service";
import { RbacService } from "../rbac/rbac.service";
import { AuditService } from "../audit/audit.service";
import { verifyPassword } from "../auth/password";
import { ADMIN_WILDCARD, SYSTEM_ROLE_DEFAULTS, TEMPLATE_ROLE_DEFAULTS, type EffectivePermissions, type PermissionKey } from "../rbac/permissions";
import type { PrismaService } from "../prisma/prisma.service";
import type { EmailService } from "../notifications/email.service";

/**
 * In-memory stand-in for the user / role / override / token / audit tables.
 * Transactions snapshot the state and roll back on error, so "one audit row
 * in the same transaction" is observable without Postgres.
 */
type Row = Record<string, any>;
interface State {
  users: Row[];
  roles: Row[];
  rolePerms: Array<{ roleId: string; permissionKey: string }>;
  overrides: Row[];
  tokens: Row[];
  actionTokens: Row[];
  resets: Row[];
  audit: Row[];
}

let seq = 0;

class FakeDb {
  state: State;
  failOn: string | null = null;

  constructor(state: Partial<State>) {
    this.state = { users: [], roles: [], rolePerms: [], overrides: [], tokens: [], actionTokens: [], resets: [], audit: [], ...state };
  }

  private maybeFail(op: string) {
    if (this.failOn === op) throw new Error(`injected failure: ${op}`);
  }

  private roleOf(u: Row): Row | null {
    const r = this.state.roles.find((x) => x.id === u.roleId);
    return r ? { ...r, permissions: this.state.rolePerms.filter((rp) => rp.roleId === r.id).map((rp) => ({ permissionKey: rp.permissionKey })) } : null;
  }

  private hydrate(u: Row | undefined, args: Row = {}): Row | null {
    if (!u) return null;
    const row: Row = { ...u };
    if (args.include || args.select) {
      row.accessRole = this.roleOf(u);
      row.permissionOverrides = this.state.overrides.filter((o) => o.userId === u.id);
      row._count = { permissionOverrides: row.permissionOverrides.length };
    }
    return row;
  }

  private matchUser(u: Row, where: Row): boolean {
    if (where.id && u.id !== where.id) return false;
    if (where.email && u.email !== where.email) return false;
    if (where.role?.not && u.role === where.role.not) return false;
    if (where.status && u.status !== where.status) return false;
    if (where.roleId && u.roleId !== where.roleId) return false;
    if (where.OR) {
      const needle = (where.OR[0].email.contains as string).toLowerCase();
      if (![u.email, u.firstName, u.lastName].some((v) => typeof v === "string" && v.toLowerCase().includes(needle))) return false;
    }
    return true;
  }

  client(): any {
    const s = () => this.state;
    const client: any = {
      user: {
        findUnique: async (args: Row) => this.hydrate(s().users.find((u) => this.matchUser(u, args.where)), args),
        findUniqueOrThrow: async (args: Row) => {
          const row = await client.user.findUnique(args);
          if (!row) throw new Error("not found");
          return row;
        },
        findMany: async (args: Row) => s().users.filter((u) => this.matchUser(u, args.where)).map((u) => this.hydrate(u, args)),
        count: async ({ where }: Row) => {
          // RbacService.assertNotLastAdmin: only the access role counts (roleId is NOT NULL since phase 5).
          if (where.accessRole?.key) {
            return s().users.filter((u) => {
              if (where.id?.not && u.id === where.id.not) return false;
              if (where.status && u.status !== where.status) return false;
              return this.roleOf(u)?.key === where.accessRole.key;
            }).length;
          }
          return s().users.filter((u) => this.matchUser(u, where)).length;
        },
        create: async ({ data }: Row) => {
          this.maybeFail("user.create");
          const row = { id: `user_${++seq}`, createdAt: new Date("2026-10-01T00:00:00Z"), phone: null, lastLoginAt: null, suspendedAt: null, suspendedReason: null, emailVerifiedAt: null, passwordChangedAt: null, ...data };
          s().users.push(row);
          return { id: row.id };
        },
        update: async ({ where, data }: Row) => {
          this.maybeFail("user.update");
          const u = s().users.find((x) => x.id === where.id)!;
          Object.assign(u, data);
          return { ...u };
        },
      },
      accessRole: {
        findUnique: async ({ where, include }: Row) => {
          const r = s().roles.find((x) => (where.id ? x.id === where.id : x.key === where.key));
          if (!r) return null;
          return include ? { ...r, permissions: s().rolePerms.filter((rp) => rp.roleId === r.id).map((rp) => ({ permissionKey: rp.permissionKey })) } : { ...r };
        },
      },
      actionToken: {
        create: async ({ data }: Row) => {
          this.maybeFail("actionToken.create");
          s().actionTokens.push({ id: `at_${++seq}`, usedAt: null, createdAt: new Date(), ...data });
        },
        findFirst: async ({ where }: Row) => s().actionTokens.find((t) => t.userId === where.userId && t.usedAt === null && t.expiresAt > new Date()) ?? null,
        updateMany: async ({ where, data }: Row) => {
          for (const t of s().actionTokens) if (t.userId === where.userId && t.usedAt === null) Object.assign(t, data);
        },
      },
      refreshToken: {
        updateMany: async ({ where, data }: Row) => {
          let count = 0;
          for (const t of s().tokens) {
            if (t.userId === where.userId && t.revokedAt === null) {
              Object.assign(t, data);
              count++;
            }
          }
          return { count };
        },
      },
      passwordReset: { create: async ({ data }: Row) => s().resets.push(data) },
      auditLog: {
        create: async ({ data }: Row) => {
          this.maybeFail("auditLog.create");
          s().audit.push(data);
          return data;
        },
      },
      $transaction: async (arg: any) => {
        const snapshot = structuredClone(this.state);
        try {
          return typeof arg === "function" ? await arg(client) : await Promise.all(arg);
        } catch (err) {
          this.state = snapshot;
          throw err;
        }
      },
    };
    return client;
  }
}

const roles = [
  { id: "role_admin", key: "admin", name: "Admin", legacyRole: "ADMIN", isSystem: true },
  { id: "role_staff", key: "staff", name: "Staff", legacyRole: "STAFF", isSystem: true },
  { id: "role_customer", key: "customer", name: "Customer", legacyRole: "CUSTOMER", isSystem: true },
  { id: "role_fulfillment", key: "fulfillment", name: "Fulfillment", legacyRole: "STAFF", isSystem: false },
  { id: "role_support", key: "support", name: "Support", legacyRole: "STAFF", isSystem: false },
];
const rolePerms = [
  ...SYSTEM_ROLE_DEFAULTS.staff.map((permissionKey) => ({ roleId: "role_staff", permissionKey })),
  ...TEMPLATE_ROLE_DEFAULTS.find((t) => t.key === "fulfillment")!.permissions.map((permissionKey) => ({ roleId: "role_fulfillment", permissionKey })),
  ...TEMPLATE_ROLE_DEFAULTS.find((t) => t.key === "support")!.permissions.map((permissionKey) => ({ roleId: "role_support", permissionKey })),
];
const baseUser = { phone: null, mustChangePassword: false, lastLoginAt: null, invitedBy: null, suspendedAt: null, suspendedReason: null, emailVerifiedAt: null, passwordChangedAt: null, createdAt: new Date("2026-09-01T00:00:00Z") };
const users = () => [
  { ...baseUser, id: "admin", email: "a@test.com", firstName: "Ada", lastName: "Admin", role: "ADMIN", status: "ACTIVE", roleId: "role_admin" },
  { ...baseUser, id: "admin2", email: "a2@test.com", firstName: "Al", lastName: "Admin", role: "ADMIN", status: "ACTIVE", roleId: "role_admin" },
  { ...baseUser, id: "lead", email: "lead@test.com", firstName: "Lee", lastName: "Lead", role: "STAFF", status: "ACTIVE", roleId: "role_staff" },
  { ...baseUser, id: "picker", email: "p@test.com", firstName: "Pat", lastName: "Picker", role: "STAFF", status: "ACTIVE", roleId: "role_fulfillment" },
  { ...baseUser, id: "paused", email: "paused@test.com", firstName: "Pau", lastName: "Sed", role: "STAFF", status: "SUSPENDED", roleId: "role_fulfillment", suspendedReason: "Left" },
  { ...baseUser, id: "cust", email: "c@test.com", firstName: "Cal", lastName: "Customer", role: "CUSTOMER", status: "ACTIVE", roleId: "role_customer" },
];
const tokens = () => [
  { id: "t1", userId: "picker", revokedAt: null },
  { id: "t2", userId: "admin2", revokedAt: null },
  { id: "t3", userId: "lead", revokedAt: null },
];

const wildcard = { id: "admin", permissions: ADMIN_WILDCARD as EffectivePermissions };
const holder = (id: string, ...perms: PermissionKey[]) => ({ id, permissions: new Set(perms) as EffectivePermissions });

function build(state: Partial<State>) {
  const db = new FakeDb(state);
  const client = db.client();
  const proxy = new Proxy(client, { get: (_t, prop) => db.client()[prop as string] }) as PrismaService;
  const email = { send: jest.fn() };
  const audit = new AuditService(proxy);
  const rbac = new RbacService(proxy, audit);
  const customers = new AdminCustomersService(proxy, audit, email as unknown as EmailService, rbac);
  const service = new StaffAdminService(proxy, audit, email as unknown as EmailService, rbac, customers);
  return { service, db, email };
}

describe("StaffAdminService.list / detail", () => {
  it("lists non-customer accounts only, with role, status and override counts", async () => {
    const { service, db } = build({ roles, rolePerms, users: users() });
    db.state.overrides.push({ id: "ov1", userId: "picker", permissionKey: "payments:mark_paid", effect: "ALLOW", expiresAt: null });
    const result = await service.list({});
    expect(result.total).toBe(5);
    expect(result.items.map((i) => i.id)).not.toContain("cust");
    const picker = result.items.find((i) => i.id === "picker")!;
    expect(picker).toMatchObject({ roleKey: "fulfillment", roleName: "Fulfillment", status: "ACTIVE", overrideCount: 1, fullName: "Pat Picker" });

    expect((await service.list({ status: "SUSPENDED" })).items.map((i) => i.id)).toEqual(["paused"]);
    expect((await service.list({ roleId: "role_admin" })).total).toBe(2);
    expect((await service.list({ search: "LEAD" })).items.map((i) => i.id)).toEqual(["lead"]);
  });

  it("detail includes effective permissions and 404s for customers", async () => {
    const { service } = build({ roles, rolePerms, users: users() });
    const detail = await service.detail("picker");
    expect(detail.permissions).toContain("orders:tracking");
    expect(detail.permissions).not.toContain("payments:mark_paid");
    expect(detail.invite).toBeNull();
    await expect(service.detail("cust")).rejects.toThrow(NotFoundException);
    await expect(service.detail("ghost")).rejects.toThrow(NotFoundException);
  });
});

describe("StaffAdminService.create", () => {
  const dto = { email: "New.Hire@Test.com", firstName: " Nia ", lastName: "Hire", roleId: "role_fulfillment" };

  it("temporary_password: creates an ACTIVE account that must change its password, hashes the password and audits once", async () => {
    const { service, db, email } = build({ roles, rolePerms, users: users() });
    const result = await service.create(wildcard, { ...dto, mode: "temporary_password", temporaryPassword: "Welcome-to-the-team-2026" }, "203.0.113.7");

    expect(result.mode).toBe("temporary_password");
    expect(result.inviteExpiresAt).toBeNull();
    expect(result.user).toMatchObject({ email: "new.hire@test.com", firstName: "Nia", status: "ACTIVE", mustChangePassword: true, roleKey: "fulfillment", role: "STAFF", invitedBy: "admin" });
    expect(JSON.stringify(result)).not.toContain("Welcome-to-the-team-2026");

    const row = db.state.users.find((u) => u.email === "new.hire@test.com")!;
    expect(row.passwordHash).not.toBe("Welcome-to-the-team-2026");
    expect(await verifyPassword("Welcome-to-the-team-2026", row.passwordHash)).toBe(true);
    expect(db.state.actionTokens).toEqual([]);
    expect(email.send).not.toHaveBeenCalled();
    expect(db.state.audit).toHaveLength(1);
    expect(db.state.audit[0]).toMatchObject({ actorId: "admin", action: "user.create", entityType: "user", entityId: row.id, ip: "203.0.113.7", diff: { mode: "temporary_password", status: "ACTIVE", mustChangePassword: true, role: { roleKey: "fulfillment" } } });
  });

  it("temporary_password: enforces the operator password rules and requires a password", async () => {
    const { service, db } = build({ roles, rolePerms, users: users() });
    await expect(service.create(wildcard, { ...dto, mode: "temporary_password" })).rejects.toMatchObject({ response: { code: "PASSWORD_REQUIRED" } });
    await expect(service.create(wildcard, { ...dto, mode: "temporary_password", temporaryPassword: "short" })).rejects.toMatchObject({ response: { code: "WEAK_PASSWORD" } });
    await expect(service.create(wildcard, { ...dto, mode: "temporary_password", temporaryPassword: " padded-with-spaces-12 " })).rejects.toMatchObject({ response: { code: "WEAK_PASSWORD" } });
    expect(db.state.users).toHaveLength(6);
    expect(db.state.audit).toEqual([]);
  });

  it("invite: creates an INVITED account with an unusable hash and a hashed 72-hour token that only goes to EmailService", async () => {
    const { service, db, email } = build({ roles, rolePerms, users: users() });
    const before = Date.now();
    const result = await service.create(wildcard, { ...dto, mode: "invite" });
    expect(result.user).toMatchObject({ status: "INVITED", mustChangePassword: false });
    expect(result.user.invite).not.toBeNull();
    expect(new Date(result.inviteExpiresAt!).getTime() - before).toBeGreaterThan(71 * 60 * 60 * 1000);

    const token = db.state.actionTokens[0]!;
    expect(token).toMatchObject({ purpose: "STAFF_INVITE", roleId: "role_fulfillment", requestedBy: "admin", usedAt: null });
    const sent = email.send.mock.calls[0]![0];
    expect(sent.to).toBe("new.hire@test.com");
    expect(sent.template).toBe("staff_invite");
    expect(createHash("sha256").update(sent.payload.inviteToken).digest("hex")).toBe(token.tokenHash);
    expect(JSON.stringify(result)).not.toContain(sent.payload.inviteToken);
    expect(db.state.audit[0]).toMatchObject({ action: "user.create", diff: { mode: "invite", status: "INVITED" } });
  });

  it("applies the grant ceiling, the admin-role rule and the customer-role rule before writing anything", async () => {
    const { service, db } = build({ roles, rolePerms, users: users() });
    const lead = holder("lead", ...SYSTEM_ROLE_DEFAULTS.staff, "users:create");
    await expect(service.create(lead, { ...dto, roleId: "role_support", mode: "invite" })).rejects.toMatchObject({ response: { code: "GRANT_CEILING" } });
    await expect(service.create(holder("lead", "users:create", "rbac:read"), { ...dto, roleId: "role_admin", mode: "invite" })).rejects.toMatchObject({
      response: { code: "FORBIDDEN_PERMISSION", required: ["rbac:manage"] },
    });
    await expect(service.create(wildcard, { ...dto, roleId: "role_customer", mode: "invite" })).rejects.toMatchObject({ response: { code: "ROLE_NOT_STAFF" } });
    await expect(service.create(wildcard, { ...dto, roleId: "role_missing", mode: "invite" })).rejects.toMatchObject({ response: { code: "ROLE_NOT_FOUND" } });
    await expect(service.create(wildcard, { ...dto, email: "P@test.com", mode: "invite" })).rejects.toMatchObject({ response: { code: "EMAIL_TAKEN" } });
    expect(db.state.users).toHaveLength(6);
    expect(db.state.actionTokens).toEqual([]);
    expect(db.state.audit).toEqual([]);
  });

  it("writes no user when the audit row fails (same transaction)", async () => {
    const { service, db } = build({ roles, rolePerms, users: users() });
    db.failOn = "auditLog.create";
    await expect(service.create(wildcard, { ...dto, mode: "invite" })).rejects.toThrow(/injected failure/);
    expect(db.state.users).toHaveLength(6);
    expect(db.state.actionTokens).toEqual([]);
  });

  it("resendInvite burns the old token and issues a new one, for INVITED accounts only", async () => {
    const { service, db, email } = build({ roles, rolePerms, users: users() });
    await service.create(wildcard, { ...dto, mode: "invite" });
    const created = db.state.users.find((u) => u.email === "new.hire@test.com")!;
    const first = db.state.actionTokens[0]!;
    await expect(service.resendInvite(wildcard, created.id)).resolves.toMatchObject({ ok: true });
    expect(first.usedAt).toBeInstanceOf(Date);
    expect(db.state.actionTokens).toHaveLength(2);
    expect(email.send).toHaveBeenCalledTimes(2);
    expect(db.state.audit.at(-1)).toMatchObject({ action: "user.invite_resend", entityId: created.id });
    await expect(service.resendInvite(wildcard, "picker")).rejects.toMatchObject({ response: { code: "NOT_INVITED" } });
  });
});

describe("StaffAdminService role / profile", () => {
  it("assignRole checks the target tier, then delegates (sessions revoked, legacy role synced, audited)", async () => {
    const { service, db } = build({ roles, rolePerms, users: users(), tokens: tokens() });
    const detail = await service.assignRole(wildcard, "picker", "role_support", "203.0.113.8");
    expect(detail).toMatchObject({ roleKey: "support", role: "STAFF" });
    expect(db.state.tokens.find((t) => t.id === "t1")!.revokedAt).not.toBeNull();
    expect(db.state.audit[0]).toMatchObject({ action: "rbac.user.role.assign", entityId: "picker" });
    await expect(service.assignRole(wildcard, "cust", "role_support")).rejects.toThrow(NotFoundException);
    await expect(service.assignRole(wildcard, "admin", "role_staff")).rejects.toMatchObject({ response: { code: "SELF_MODIFICATION" } });
  });

  it("update changes name/phone and audits a field diff", async () => {
    const { service, db } = build({ roles, rolePerms, users: users() });
    const detail = await service.update(wildcard, "picker", { firstName: "Patricia", phone: "555-0100" });
    expect(detail).toMatchObject({ firstName: "Patricia", lastName: "Picker", phone: "555-0100" });
    expect(db.state.audit[0]).toMatchObject({ action: "user.update", entityId: "picker", diff: { firstName: { from: "Pat", to: "Patricia" }, phone: { from: null, to: "555-0100" } } });
  });
});

describe("StaffAdminService suspend / reactivate", () => {
  it("suspend records the reason, revokes sessions and audits in one transaction", async () => {
    const { service, db } = build({ roles, rolePerms, users: users(), tokens: tokens() });
    const detail = await service.suspend(wildcard, "picker", "  Left the company ", "203.0.113.9");
    expect(detail).toMatchObject({ status: "SUSPENDED", suspendedReason: "Left the company" });
    expect(detail.suspendedAt).not.toBeNull();
    expect(db.state.tokens.find((t) => t.id === "t1")!.revokedAt).not.toBeNull();
    expect(db.state.tokens.find((t) => t.id === "t3")!.revokedAt).toBeNull();
    expect(db.state.audit).toHaveLength(1);
    expect(db.state.audit[0]).toMatchObject({ actorId: "admin", action: "user.suspend", entityId: "picker", ip: "203.0.113.9", diff: { status: { from: "ACTIVE", to: "SUSPENDED" }, reason: "Left the company" } });
    await expect(service.suspend(wildcard, "picker", "again")).rejects.toMatchObject({ response: { code: "ALREADY_SUSPENDED" } });
  });

  it("refuses self, customers and the last active admin; a second admin can be suspended", async () => {
    const { service, db } = build({ roles, rolePerms, users: users(), tokens: tokens() });
    await expect(service.suspend(wildcard, "admin", "no")).rejects.toMatchObject({ response: { code: "SELF_MODIFICATION" } });
    await expect(service.suspend(wildcard, "cust", "no")).rejects.toThrow(NotFoundException);

    await expect(service.suspend(wildcard, "admin2", "Contractor ended")).resolves.toMatchObject({ status: "SUSPENDED" });
    expect(db.state.tokens.find((t) => t.id === "t2")!.revokedAt).not.toBeNull();
    // Now `admin` is the only active admin: another wildcard holder cannot suspend them.
    await expect(service.suspend({ id: "lead", permissions: ADMIN_WILDCARD }, "admin", "no")).rejects.toThrow(ConflictException);
    expect(db.state.users.find((u) => u.id === "admin")!.status).toBe("ACTIVE");
  });

  it("rolls back the status change when the audit row fails", async () => {
    const { service, db } = build({ roles, rolePerms, users: users(), tokens: tokens() });
    db.failOn = "auditLog.create";
    await expect(service.suspend(wildcard, "picker", "Left")).rejects.toThrow(/injected failure/);
    expect(db.state.users.find((u) => u.id === "picker")).toMatchObject({ status: "ACTIVE", suspendedReason: null });
    expect(db.state.tokens.find((t) => t.id === "t1")!.revokedAt).toBeNull();
  });

  it("reactivate clears the suspension and audits; only SUSPENDED accounts qualify", async () => {
    const { service, db } = build({ roles, rolePerms, users: users() });
    const detail = await service.reactivate(wildcard, "paused", "Back from leave");
    expect(detail).toMatchObject({ status: "ACTIVE", suspendedAt: null, suspendedReason: null });
    expect(db.state.audit[0]).toMatchObject({ action: "user.reactivate", entityId: "paused", diff: { status: { from: "SUSPENDED", to: "ACTIVE" }, previousReason: "Left", reason: "Back from leave" } });
    await expect(service.reactivate(wildcard, "picker", undefined)).rejects.toMatchObject({ response: { code: "NOT_SUSPENDED" } });
  });
});

describe("StaffAdminService.resetPassword", () => {
  it("resets staff only, through the shared admin reset path (another admin stays CLI-only)", async () => {
    const { service, db, email } = build({ roles, rolePerms, users: users(), tokens: tokens() });
    await expect(service.resetPassword(wildcard, "picker", "203.0.113.3")).resolves.toEqual({ ok: true });
    expect(db.state.resets).toHaveLength(1);
    expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: "p@test.com", template: "admin_password_reset" }));
    expect(db.state.tokens.find((t) => t.id === "t1")!.revokedAt).not.toBeNull();

    await expect(service.resetPassword(wildcard, "admin2")).rejects.toMatchObject({ response: { code: "FORBIDDEN_TARGET" } });
    await expect(service.resetPassword(wildcard, "cust")).rejects.toThrow(NotFoundException);
    await expect(service.resetPassword(holder("lead", "customers:reset_password"), "picker")).rejects.toThrow(ForbiddenException);
    expect(db.state.resets).toHaveLength(1);
  });
});
