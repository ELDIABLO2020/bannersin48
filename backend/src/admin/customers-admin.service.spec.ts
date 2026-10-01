import { ForbiddenException } from "@nestjs/common";
import { createHash } from "crypto";
import { AdminCustomersService } from "./customers-admin.service";
import { RbacService } from "../rbac/rbac.service";
import { ADMIN_WILDCARD, type EffectivePermissions, type PermissionKey } from "../rbac/permissions";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";
import type { EmailService } from "../notifications/email.service";

const accounts: Record<string, { id: string; email: string; role: string; accessRole: { key: string } | null }> = {
  cust: { id: "cust", email: "cust@test.com", role: "CUSTOMER", accessRole: { key: "customer" } },
  staff: { id: "staff", email: "staff@test.com", role: "STAFF", accessRole: { key: "staff" } },
  staff2: { id: "staff2", email: "staff2@test.com", role: "STAFF", accessRole: { key: "staff" } },
  support: { id: "support", email: "support@test.com", role: "STAFF", accessRole: { key: "support" } },
  editor: { id: "editor", email: "editor@test.com", role: "CONTENT_EDITOR", accessRole: { key: "content_editor" } },
  admin: { id: "admin", email: "admin@test.com", role: "ADMIN", accessRole: { key: "admin" } },
  admin2: { id: "admin2", email: "admin2@test.com", role: "ADMIN", accessRole: { key: "admin" } },
  legacyAdmin: { id: "legacyAdmin", email: "legacy@test.com", role: "ADMIN", accessRole: null },
};

/** Effective permissions per actor: the stripped default staff holds no reset permission at all. */
const grants: Record<string, EffectivePermissions> = {
  cust: new Set(),
  staff: new Set<PermissionKey>(["orders:read", "customers:read"]),
  staff2: new Set<PermissionKey>(["orders:read", "customers:read"]),
  support: new Set<PermissionKey>(["customers:read", "customers:reset_password"]),
  editor: new Set<PermissionKey>(["content:read"]),
  admin: ADMIN_WILDCARD,
  admin2: ADMIN_WILDCARD,
  legacyAdmin: ADMIN_WILDCARD,
};

function setup() {
  const resets: Array<{ tokenHash: string; requestedBy: string }> = [];
  const prisma = {
    user: { findUnique: jest.fn(async ({ where }: { where: { id: string } }) => accounts[where.id] ?? null) },
    passwordReset: { create: jest.fn(({ data }: { data: { tokenHash: string; requestedBy: string } }) => resets.push(data)) },
    refreshToken: { updateMany: jest.fn(() => ({ count: 1 })) },
    $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops)),
  };
  const email = { send: jest.fn() };
  const audit = { record: jest.fn() };
  const rbac = new RbacService(prisma as unknown as PrismaService, audit as unknown as AuditService);
  const service = new AdminCustomersService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    email as unknown as EmailService,
    rbac,
  );
  return { service, prisma, email, audit, resets };
}

const actor = (id: string) => ({ id, permissions: grants[id]! });

describe("AdminCustomersService.adminResetPassword", () => {
  it.each([
    ["support", "cust"], // customers:reset_password → customer target
    ["admin", "cust"],
    ["admin", "staff"],
    ["admin", "editor"],
    ["admin", "admin"], // own account
    ["legacyAdmin", "cust"], // ADMIN by enum only (roleId not yet backfilled) still resolves to the wildcard
  ])("%s may reset %s", async (actorId, targetId) => {
    const { service, resets } = setup();
    await expect(service.adminResetPassword(actor(actorId), targetId, "203.0.113.9")).resolves.toEqual({ ok: true });
    expect(resets).toHaveLength(1);
  });

  it.each([
    ["staff", "cust"], // default staff no longer holds customers:reset_password (plan §11 decision 2)
    ["staff", "staff2"],
    ["staff", "staff"],
    ["staff", "editor"],
    ["staff", "admin"],
    ["support", "staff"], // customers:reset_password does not cover staff targets
    ["support", "support"],
    ["admin", "admin2"], // another admin is CLI-only
    ["admin", "legacyAdmin"],
    ["editor", "cust"],
    ["cust", "cust"],
  ])("%s may not reset %s", async (actorId, targetId) => {
    const { service, prisma, email } = setup();
    await expect(service.adminResetPassword(actor(actorId), targetId)).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it("names the reason: FORBIDDEN_TARGET for admins, FORBIDDEN_PERMISSION for a missing permission", async () => {
    const { service } = setup();
    await expect(service.adminResetPassword(actor("admin"), "admin2")).rejects.toMatchObject({ response: { code: "FORBIDDEN_TARGET" } });
    await expect(service.adminResetPassword(actor("staff"), "cust")).rejects.toMatchObject({
      response: { code: "FORBIDDEN_PERMISSION", required: ["customers:reset_password"] },
    });
    await expect(service.adminResetPassword(actor("support"), "staff")).rejects.toMatchObject({
      response: { code: "FORBIDDEN_PERMISSION", required: ["users:reset_password"] },
    });
  });

  it("never returns the reset token; it only goes to the email transport", async () => {
    const { service, email, resets, audit } = setup();
    const result = await service.adminResetPassword(actor("support"), "cust", "203.0.113.9");

    expect(result).toEqual({ ok: true });
    expect(JSON.stringify(result)).not.toMatch(/[a-f0-9]{64}/);
    const sent = email.send.mock.calls[0][0];
    expect(sent.to).toBe("cust@test.com");
    expect(createHash("sha256").update(sent.payload.resetToken).digest("hex")).toBe(resets[0]!.tokenHash);
    expect(resets[0]!.requestedBy).toBe("support");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: "support", entityId: "cust", ip: "203.0.113.9", action: "customer.admin_password_reset" }),
    );
  });
});

/**
 * Profile edits and suspension (plan §5.2, task 4.1). A small in-memory user
 * table whose transactions roll back on error, so "audit row in the same
 * transaction" and "sessions revoked" are observable without Postgres.
 */
function setupAccounts() {
  type Row = Record<string, any>;
  const state = {
    users: [
      { id: "cust", email: "cust@test.com", role: "CUSTOMER", status: "ACTIVE", firstName: "Casey", lastName: "Customer", phone: null, rewardPointsBalance: 120, suspendedAt: null, suspendedReason: null, emailVerifiedAt: new Date("2026-09-01T00:00:00Z"), lastLoginAt: null, createdAt: new Date("2026-08-01T00:00:00Z"), updatedAt: new Date("2026-08-01T00:00:00Z"), addresses: [], accessRole: null, permissionOverrides: [] },
      { id: "staff", email: "staff@test.com", role: "STAFF", status: "ACTIVE", firstName: "Pat", lastName: "Picker", phone: null, rewardPointsBalance: 0, suspendedAt: null, suspendedReason: null, emailVerifiedAt: null, lastLoginAt: null, createdAt: new Date("2026-08-01T00:00:00Z"), updatedAt: new Date("2026-08-01T00:00:00Z"), addresses: [], accessRole: { key: "staff", permissions: [] }, permissionOverrides: [] },
    ] as Row[],
    tokens: [{ id: "rt_1", userId: "cust", revokedAt: null }] as Row[],
    audit: [] as Row[],
  };
  let failOn: string | null = null;
  const client = (): any => ({
    user: {
      findUnique: async ({ where }: Row) => structuredClone(state.users.find((u) => u.id === where.id) ?? null),
      findFirst: async ({ where }: Row) => structuredClone(state.users.find((u) => u.role === where.role && where.OR.some((c: Row) => (c.id && c.id === u.id) || (c.email && c.email === u.email))) ?? null),
      update: async ({ where, data }: Row) => {
        if (failOn === "user.update") throw new Error("injected failure: user.update");
        const u = state.users.find((x) => x.id === where.id)!;
        Object.assign(u, data);
        return structuredClone(u);
      },
    },
    order: { findMany: async () => [], count: async () => 0 },
    refreshToken: {
      updateMany: async ({ where, data }: Row) => {
        const rows = state.tokens.filter((t) => t.userId === where.userId && t.revokedAt === null);
        for (const t of rows) Object.assign(t, data);
        return { count: rows.length };
      },
    },
    auditLog: {
      create: async ({ data }: Row) => {
        if (failOn === "auditLog.create") throw new Error("injected failure: auditLog.create");
        state.audit.push(data);
      },
    },
    $transaction: async (fn: (tx: any) => Promise<unknown>) => {
      const snapshot = structuredClone(state);
      try {
        return await fn(client());
      } catch (err) {
        Object.assign(state, snapshot);
        throw err;
      }
    },
  });
  const prisma = client() as PrismaService;
  const audit = { record: async (entry: Row, tx: any = prisma) => tx.auditLog.create({ data: entry }) } as unknown as AuditService;
  const rbac = new RbacService(prisma, audit);
  const service = new AdminCustomersService(prisma, audit, { send: jest.fn() } as unknown as EmailService, rbac);
  return { service, state, setFailOn: (op: string | null) => (failOn = op) };
}

const support = { id: "support", permissions: new Set<PermissionKey>(["customers:read", "customers:update", "customers:suspend"]) };

describe("AdminCustomersService.detail", () => {
  it("serves customer accounts with their account state, and 404s staff ids", async () => {
    const { service } = setupAccounts();
    const detail = await service.detail("cust");
    expect(detail.user).toMatchObject({ id: "cust", email: "cust@test.com", fullName: "Casey Customer", rewardsPoints: 120 });
    expect(detail.account).toEqual({ status: "ACTIVE", suspendedAt: null, suspendedReason: null, emailVerifiedAt: "2026-09-01T00:00:00.000Z", lastLoginAt: null, rewardBalanceCents: 120, orderCount: 0 });
    await expect(service.detail("staff")).rejects.toMatchObject({ status: 404 });
    await expect(service.detail("CUST@test.com")).resolves.toMatchObject({ user: { id: "cust" } });
  });
});

describe("AdminCustomersService.update / suspend / reactivate", () => {
  it("edits name and phone with a field diff in the audit row", async () => {
    const { service, state } = setupAccounts();
    const detail = await service.update(support, "cust", { lastName: "Customer-Jones", phone: " 734-555-0100 " }, "203.0.113.4");
    expect(detail.user).toMatchObject({ fullName: "Casey Customer-Jones", phone: "734-555-0100" });
    expect(state.audit).toEqual([
      expect.objectContaining({ action: "customer.update", actorId: "support", entityId: "cust", ip: "203.0.113.4", diff: { lastName: { from: "Customer", to: "Customer-Jones" }, phone: { from: null, to: "734-555-0100" } } }),
    ]);
  });

  it("suspends with a reason, revokes sessions and audits; reactivation clears it", async () => {
    const { service, state } = setupAccounts();
    const suspended = await service.suspend(support, "cust", "Chargeback abuse", "203.0.113.4");
    expect(suspended.account).toMatchObject({ status: "SUSPENDED", suspendedReason: "Chargeback abuse" });
    expect(suspended.account.suspendedAt).toEqual(expect.any(String));
    expect(state.tokens[0].revokedAt).toBeInstanceOf(Date);
    expect(state.audit.at(-1)).toMatchObject({ action: "customer.suspend", diff: { status: { from: "ACTIVE", to: "SUSPENDED" }, reason: "Chargeback abuse" } });

    await expect(service.suspend(support, "cust", "Again")).rejects.toMatchObject({ response: { code: "ALREADY_SUSPENDED" } });

    const reactivated = await service.reactivate(support, "cust", "Resolved with the bank");
    expect(reactivated.account).toMatchObject({ status: "ACTIVE", suspendedAt: null, suspendedReason: null });
    expect(state.audit.at(-1)).toMatchObject({ action: "customer.reactivate", diff: { status: { from: "SUSPENDED", to: "ACTIVE" }, previousReason: "Chargeback abuse", reason: "Resolved with the bank" } });
    await expect(service.reactivate(support, "cust", undefined)).rejects.toMatchObject({ response: { code: "NOT_SUSPENDED" } });
  });

  it("writes nothing when the audit row fails", async () => {
    const { service, state, setFailOn } = setupAccounts();
    setFailOn("auditLog.create");
    await expect(service.suspend(support, "cust", "Will roll back")).rejects.toThrow("injected failure");
    expect(state.users[0]).toMatchObject({ status: "ACTIVE", suspendedReason: null });
    expect(state.tokens[0].revokedAt).toBeNull();
    expect(state.audit).toEqual([]);
  });

  it("applies to customer accounts only (403 FORBIDDEN_TARGET for staff) and 404s unknown ids", async () => {
    const { service, state } = setupAccounts();
    await expect(service.update(support, "staff", { firstName: "X" })).rejects.toMatchObject({ response: { code: "FORBIDDEN_TARGET" } });
    await expect(service.suspend(support, "staff", "Not a customer")).rejects.toThrow(ForbiddenException);
    await expect(service.suspend(support, "nobody", "Not a customer")).rejects.toMatchObject({ status: 404 });
    expect(state.audit).toEqual([]);
  });
});
