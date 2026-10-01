import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
import { UsersService, maskIp } from "./users.service";
import { AuditService } from "../audit/audit.service";
import type { EmailService } from "../notifications/email.service";
import { hashPassword, verifyPassword } from "../auth/password";
import type { PrismaService } from "../prisma/prisma.service";

type Row = Record<string, any>;

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

/** In-memory Prisma stand-in for the user, its sessions, addresses, action tokens and ledger. */
function setup(user: Row, others: Row[] = []) {
  const state = { user, others, tokens: [] as Row[], actionTokens: [] as Row[], addresses: [] as Row[], ledger: [] as Row[], audit: [] as Row[] };
  const allUsers = () => [state.user, ...state.others];
  const matchSessions = (where: Row) =>
    state.tokens.filter(
      (t) =>
        (where.id === undefined || t.id === where.id) &&
        (where.userId === undefined || t.userId === where.userId) &&
        (!("revokedAt" in where) || t.revokedAt === where.revokedAt) &&
        (where.NOT?.tokenHash === undefined || t.tokenHash !== where.NOT.tokenHash) &&
        (where.NOT?.id === undefined || t.id !== where.NOT.id) &&
        (where.expiresAt?.gt === undefined || t.expiresAt > where.expiresAt.gt),
    );
  const prisma: any = {
    user: {
      findUniqueOrThrow: async ({ where }: Row) => {
        const found = allUsers().find((u) => u.id === where.id);
        if (!found) throw new Error("not found");
        return { ...found, addresses: state.addresses.filter((a) => a.userId === found.id) };
      },
      findUnique: async ({ where }: Row) => allUsers().find((u) => (where.id ? u.id === where.id : u.email === where.email)) ?? null,
      update: async ({ where, data }: Row) => Object.assign(allUsers().find((u) => u.id === where.id)!, data),
    },
    refreshToken: {
      findMany: async ({ where }: Row) => matchSessions(where),
      findUnique: async ({ where }: Row) => state.tokens.find((t) => t.id === where.id) ?? null,
      updateMany: async ({ where, data }: Row) => {
        const rows = matchSessions(where);
        for (const t of rows) Object.assign(t, data);
        return { count: rows.length };
      },
    },
    actionToken: {
      create: async ({ data }: Row) => {
        const row = { id: `at_${state.actionTokens.length + 1}`, usedAt: null, ...data };
        state.actionTokens.push(row);
        return row;
      },
      updateMany: async ({ where, data }: Row) => {
        for (const t of state.actionTokens) if (t.userId === where.userId && t.purpose === where.purpose && t.usedAt === null) Object.assign(t, data);
      },
    },
    address: {
      findMany: async ({ where }: Row) => state.addresses.filter((a) => a.userId === where.userId),
      findUnique: async ({ where }: Row) => state.addresses.find((a) => a.id === where.id) ?? null,
      count: async ({ where }: Row) => state.addresses.filter((a) => a.userId === where.userId).length,
      create: async ({ data }: Row) => {
        const row = { id: `addr_${state.addresses.length + 1}`, ...data };
        state.addresses.push(row);
        return row;
      },
      update: async ({ where, data }: Row) => Object.assign(state.addresses.find((a) => a.id === where.id)!, data),
      updateMany: async ({ where, data }: Row) => {
        for (const a of state.addresses) if (a.userId === where.userId && (where.NOT?.id === undefined || a.id !== where.NOT.id)) Object.assign(a, data);
      },
      delete: async ({ where }: Row) => state.addresses.splice(state.addresses.findIndex((a) => a.id === where.id), 1),
    },
    rewardLedger: {
      count: async ({ where }: Row) => state.ledger.filter((r) => r.userId === where.userId).length,
      findMany: async ({ where, skip, take }: Row) =>
        state.ledger
          .filter((r) => r.userId === where.userId)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(skip, skip + take)
          .map((r) => ({ ...r, order: r.orderId ? { number: `BI48-${r.orderId}` } : null })),
    },
    auditLog: { create: async ({ data }: Row) => state.audit.push(data) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };
  const email = { send: jest.fn(async (_input: Row) => undefined) };
  const service = new UsersService(prisma as PrismaService, new AuditService(prisma as PrismaService), email as unknown as EmailService);
  return { state, service, email };
}

describe("UsersService.changePassword", () => {
  it("rejects a wrong current password without touching sessions or the hash", async () => {
    const { service, state } = setup({ id: "u1", role: "CUSTOMER", mustChangePassword: false, passwordHash: await hashPassword("old-password") });
    state.tokens.push({ id: "rt1", userId: "u1", tokenHash: sha("r1"), revokedAt: null });
    await expect(service.changePassword("u1", { currentPassword: "nope", newPassword: "new-password-1" })).rejects.toMatchObject({ response: { code: "INVALID_CURRENT_PASSWORD" } });
    expect(await verifyPassword("old-password", state.user.passwordHash)).toBe(true);
    expect(state.tokens[0]!.revokedAt).toBeNull();
    expect(state.audit).toEqual([]);
  });

  it("sets the new hash, clears mustChangePassword, revokes every other session and audits", async () => {
    const { service, state } = setup({ id: "u1", role: "STAFF", mustChangePassword: true, passwordHash: await hashPassword("Temporary-pass-123") });
    state.tokens.push(
      { id: "rt1", userId: "u1", tokenHash: sha("mine"), revokedAt: null },
      { id: "rt2", userId: "u1", tokenHash: sha("other"), revokedAt: null },
      { id: "rt3", userId: "u2", tokenHash: sha("someone"), revokedAt: null },
    );

    await expect(service.changePassword("u1", { currentPassword: "Temporary-pass-123", newPassword: "A-real-password-2026", keepRefreshToken: "mine" }, "203.0.113.1")).resolves.toEqual({ ok: true });
    expect(await verifyPassword("A-real-password-2026", state.user.passwordHash)).toBe(true);
    expect(state.user.mustChangePassword).toBe(false);
    expect(state.user.passwordChangedAt).toBeInstanceOf(Date);
    expect(state.tokens.map((t) => t.revokedAt === null)).toEqual([true, false, true]);
    expect(state.audit).toEqual([
      expect.objectContaining({ actorId: "u1", action: "user.change_password", entityType: "user", entityId: "u1", ip: "203.0.113.1", diff: { passwordChanged: true, firstLogin: true } }),
    ]);
  });

  it("holds staff to the operator password rules and refuses reuse; customers keep the 8-char floor", async () => {
    const staff = setup({ id: "s1", role: "STAFF", mustChangePassword: true, passwordHash: await hashPassword("Temporary-pass-123") });
    await expect(staff.service.changePassword("s1", { currentPassword: "Temporary-pass-123", newPassword: "short-one" })).rejects.toMatchObject({ response: { code: "WEAK_PASSWORD" } });
    await expect(staff.service.changePassword("s1", { currentPassword: "Temporary-pass-123", newPassword: "Temporary-pass-123" })).rejects.toMatchObject({ response: { code: "PASSWORD_REUSED" } });
    expect(staff.state.user.mustChangePassword).toBe(true);

    const customer = setup({ id: "c1", role: "CUSTOMER", mustChangePassword: false, passwordHash: await hashPassword("old-password") });
    await expect(customer.service.changePassword("c1", { currentPassword: "old-password", newPassword: "eightchr" })).resolves.toEqual({ ok: true });
    await expect(customer.service.changePassword("c1", { currentPassword: "eightchr", newPassword: "eightchr" })).rejects.toThrow(BadRequestException);
  });
});

describe("UsersService sessions", () => {
  const future = new Date(Date.now() + 86_400_000);
  const seed = (state: { tokens: Row[] }) =>
    state.tokens.push(
      { id: "rt_me", userId: "u1", tokenHash: sha("a"), revokedAt: null, expiresAt: future, createdAt: new Date("2026-09-01T00:00:00Z"), lastUsedAt: new Date("2026-09-30T10:00:00Z"), ip: "203.0.113.77", userAgent: "Mozilla/5.0 (iPhone)" },
      { id: "rt_laptop", userId: "u1", tokenHash: sha("b"), revokedAt: null, expiresAt: future, createdAt: new Date("2026-08-01T00:00:00Z"), lastUsedAt: null, ip: "2001:db8:85a3:1234:abcd::1", userAgent: null },
      { id: "rt_old", userId: "u1", tokenHash: sha("c"), revokedAt: new Date(), expiresAt: future, createdAt: new Date(), lastUsedAt: null, ip: null, userAgent: null },
      { id: "rt_other_user", userId: "u2", tokenHash: sha("d"), revokedAt: null, expiresAt: future, createdAt: new Date(), lastUsedAt: null, ip: "10.0.0.1", userAgent: "x" },
    );

  it("lists live sessions with masked addresses and flags the current one", async () => {
    const { service, state } = setup({ id: "u1" });
    seed(state);
    const sessions = await service.listSessions("u1", "rt_me");
    expect(sessions.map((s) => s.id)).toEqual(["rt_me", "rt_laptop"]);
    expect(sessions[0]).toMatchObject({ current: true, ip: "203.0.113.0/24", userAgent: "Mozilla/5.0 (iPhone)", lastUsedAt: "2026-09-30T10:00:00.000Z" });
    expect(sessions[1]).toMatchObject({ current: false, ip: "2001:db8:85a3:1234::/64", userAgent: null, lastUsedAt: null });
    // No token material ever leaves the service.
    expect(JSON.stringify(sessions)).not.toContain("tokenHash");
  });

  it("revokes one of its own sessions and answers 404 for someone else's", async () => {
    const { service, state } = setup({ id: "u1" });
    seed(state);
    await expect(service.revokeSession("u1", "rt_laptop")).resolves.toEqual({ ok: true });
    expect(state.tokens.find((t) => t.id === "rt_laptop")!.revokedAt).toBeInstanceOf(Date);
    await expect(service.revokeSession("u1", "rt_other_user")).rejects.toThrow(NotFoundException);
    await expect(service.revokeSession("u1", "rt_missing")).rejects.toThrow(NotFoundException);
    await expect(service.revokeSession("u1", "")).rejects.toThrow(BadRequestException);
    expect(state.tokens.find((t) => t.id === "rt_other_user")!.revokedAt).toBeNull();
  });

  it("signs out every other device, keeping the current session, and audits", async () => {
    const { service, state } = setup({ id: "u1" });
    seed(state);
    await expect(service.revokeOtherSessions("u1", "rt_me", "203.0.113.2")).resolves.toEqual({ revoked: 1 });
    expect(state.tokens.find((t) => t.id === "rt_me")!.revokedAt).toBeNull();
    expect(state.tokens.find((t) => t.id === "rt_laptop")!.revokedAt).toBeInstanceOf(Date);
    expect(state.tokens.find((t) => t.id === "rt_other_user")!.revokedAt).toBeNull();
    expect(state.audit).toEqual([expect.objectContaining({ actorId: "u1", action: "user.revoke_sessions", diff: { revoked: 1, keptCurrent: true }, ip: "203.0.113.2" })]);
  });

  it("revokes everything when the token predates session ids", async () => {
    const { service, state } = setup({ id: "u1" });
    seed(state);
    await expect(service.revokeOtherSessions("u1", null)).resolves.toEqual({ revoked: 2 });
  });

  it("masks IPv4 to /24 and IPv6 to /64", () => {
    expect(maskIp("203.0.113.77")).toBe("203.0.113.0/24");
    expect(maskIp("2001:db8:85a3:1234:abcd:ef00:1:2")).toBe("2001:db8:85a3:1234::/64");
    expect(maskIp("::1")).toBe("::/64");
    expect(maskIp(null)).toBeNull();
    expect(maskIp("garbage")).toBeNull();
  });
});

describe("UsersService rewards", () => {
  it("pages the ledger newest first with the order number and never the adjusting staff id", async () => {
    const { service, state } = setup({ id: "u1", rewardPointsBalance: 1700 });
    state.ledger.push(
      { id: "rl_1", userId: "u1", deltaCents: 1200, reason: "ORDER_EARN", orderId: "o1", createdBy: null, createdAt: new Date("2026-09-01T00:00:00Z") },
      { id: "rl_2", userId: "u1", deltaCents: 1000, reason: "ADJUSTMENT", orderId: null, createdBy: "admin_1", createdAt: new Date("2026-09-10T00:00:00Z") },
      { id: "rl_3", userId: "u1", deltaCents: -500, reason: "REDEMPTION", orderId: "o2", createdBy: "admin_1", createdAt: new Date("2026-09-20T00:00:00Z") },
      { id: "rl_x", userId: "u2", deltaCents: 99999, reason: "ADJUSTMENT", orderId: null, createdBy: "admin_1", createdAt: new Date() },
    );
    const page1 = await service.getRewards("u1", { pageSize: 2 });
    expect(page1).toMatchObject({ balanceCents: 1700, page: 1, pageSize: 2, total: 3 });
    expect(page1.ledger.map((r) => r.id)).toEqual(["rl_3", "rl_2"]);
    expect(page1.ledger[0]).toEqual({ id: "rl_3", deltaCents: -500, reason: "REDEMPTION", orderId: "o2", orderNumber: "BI48-o2", createdAt: "2026-09-20T00:00:00.000Z" });
    expect(JSON.stringify(page1)).not.toContain("createdBy");
    const page2 = await service.getRewards("u1", { page: 2, pageSize: 2 });
    expect(page2.ledger.map((r) => r.id)).toEqual(["rl_1"]);
    // The denormalised balance equals the ledger sum.
    const sum = state.ledger.filter((r) => r.userId === "u1").reduce((n, r) => n + r.deltaCents, 0);
    expect(sum).toBe(page1.balanceCents);
  });
});

describe("UsersService settings and profile", () => {
  it("updates only the fields sent and trims them", async () => {
    const { service, state } = setup({ id: "u1", email: "a@test.com", firstName: "A", lastName: "B", phone: "1", role: "CUSTOMER", rewardPointsBalance: 0, createdAt: new Date(), notifyOrderUpdates: true, notifyMarketing: false });
    const profile = await service.updateProfile("u1", { firstName: "  Ada ", phone: "   " });
    expect(state.user).toMatchObject({ firstName: "Ada", lastName: "B", phone: null });
    expect(profile).toMatchObject({ firstName: "Ada", lastName: "B", phone: null, fullName: "Ada B" });
    const settings = await service.updateSettings("u1", { notifyMarketing: true });
    expect(state.user).toMatchObject({ notifyOrderUpdates: true, notifyMarketing: true });
    expect(settings).toMatchObject({ notifyOrderUpdates: true, notifyMarketing: true, emailVerifiedAt: null, pendingEmail: null });
  });
});

describe("UsersService email change", () => {
  const base = async () => ({ id: "u1", email: "me@test.com", passwordHash: await hashPassword("password123"), emailVerifiedAt: null, pendingEmail: null });

  it("checks the password before revealing anything about the new address", async () => {
    const { service, state, email } = setup(await base(), [{ id: "u2", email: "taken@test.com" }]);
    await expect(service.requestEmailChange("u1", { newEmail: "taken@test.com", currentPassword: "wrong" })).rejects.toMatchObject({ response: { code: "INVALID_CURRENT_PASSWORD" } });
    expect(state.user.pendingEmail).toBeNull();
    expect(state.actionTokens).toEqual([]);
    expect(email.send).not.toHaveBeenCalled();
  });

  it("refuses the current address and a taken one (after the password check)", async () => {
    const { service } = setup(await base(), [{ id: "u2", email: "taken@test.com" }]);
    await expect(service.requestEmailChange("u1", { newEmail: "ME@test.com", currentPassword: "password123" })).rejects.toMatchObject({ response: { code: "EMAIL_UNCHANGED" } });
    await expect(service.requestEmailChange("u1", { newEmail: "taken@test.com", currentPassword: "password123" })).rejects.toThrow(ConflictException);
  });

  it("stores pendingEmail and a hashed 1-hour token, mails the new address the link and the old one a notice, and audits", async () => {
    const { service, state, email } = setup(await base());
    state.actionTokens.push({ id: "at_old", userId: "u1", purpose: "EMAIL_CHANGE", tokenHash: "x", payload: { newEmail: "stale@test.com" }, usedAt: null });
    const result = await service.requestEmailChange("u1", { newEmail: " New@Test.com ", currentPassword: "password123" }, "203.0.113.3");
    expect(result).toEqual({ ok: true, pendingEmail: "new@test.com" });
    expect(state.user.pendingEmail).toBe("new@test.com");
    // The stale token is burned; the fresh one is stored hashed with the target address in its payload.
    expect(state.actionTokens.find((t) => t.id === "at_old")!.usedAt).toBeInstanceOf(Date);
    const fresh = state.actionTokens.at(-1)!;
    expect(fresh).toMatchObject({ userId: "u1", purpose: "EMAIL_CHANGE", payload: { newEmail: "new@test.com" }, usedAt: null });
    expect(fresh.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(fresh.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(60 * 60 * 1000);
    const confirm = email.send.mock.calls.find(([input]) => input.template === "email_change_confirm")![0];
    expect(confirm.to).toBe("new@test.com");
    expect(sha(confirm.payload.confirmToken)).toBe(fresh.tokenHash);
    expect(email.send).toHaveBeenCalledWith({ to: "me@test.com", template: "email_change_requested_notice", payload: { newEmail: "new@test.com" } });
    expect(state.audit).toEqual([expect.objectContaining({ actorId: "u1", action: "user.email_change_requested", diff: { email: { from: "me@test.com", to: "new@test.com" } }, ip: "203.0.113.3" })]);
  });

  it("resends a verification link for the current address only while it is unverified", async () => {
    const { service, state, email } = setup(await base());
    await expect(service.resendVerification("u1")).resolves.toEqual({ ok: true });
    const token = state.actionTokens.at(-1)!;
    expect(token).toMatchObject({ purpose: "EMAIL_VERIFY", payload: { email: "me@test.com" } });
    const sent = email.send.mock.calls.at(-1)![0];
    expect(sent).toMatchObject({ to: "me@test.com", template: "email_verify" });
    expect(sha(sent.payload.verifyToken)).toBe(token.tokenHash);

    state.user.emailVerifiedAt = new Date();
    await expect(service.resendVerification("u1")).rejects.toMatchObject({ response: { code: "ALREADY_VERIFIED" } });
  });
});

describe("UsersService address book", () => {
  const dto = { line1: "1 Main St", city: "Ypsilanti", state: "mi", zip: "48197" };

  it("makes the first address the default, lets one become the default, and never touches another user's rows", async () => {
    const { service, state } = setup({ id: "u1" });
    state.addresses.push({ id: "addr_theirs", userId: "u2", line1: "9 Else Rd", city: "X", state: "OH", zip: "43000", country: "US", isDefaultShipping: true });
    const first = await service.createAddress("u1", dto);
    expect(first).toMatchObject({ state: "MI", country: "US", isDefaultShipping: true });
    const second = await service.createAddress("u1", { ...dto, line1: "2 Side St" });
    expect(second.isDefaultShipping).toBe(false);

    const promoted = await service.setDefaultAddress("u1", second.id);
    expect(promoted.isDefaultShipping).toBe(true);
    expect(state.addresses.find((a) => a.id === first.id)!.isDefaultShipping).toBe(false);
    expect(state.addresses.find((a) => a.id === "addr_theirs")!.isDefaultShipping).toBe(true);

    for (const attempt of [
      () => service.setDefaultAddress("u1", "addr_theirs"),
      () => service.updateAddress("u1", "addr_theirs", dto),
      () => service.deleteAddress("u1", "addr_theirs"),
    ]) {
      await expect(attempt()).rejects.toThrow(NotFoundException);
    }
    expect(state.addresses.find((a) => a.id === "addr_theirs")).toMatchObject({ line1: "9 Else Rd" });
    expect((await service.listAddresses("u1")).map((a) => a.id)).toEqual([first.id, second.id]);
  });
});
