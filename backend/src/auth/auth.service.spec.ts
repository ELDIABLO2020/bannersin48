import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { BadRequestException, ConflictException, HttpException, UnauthorizedException } from "@nestjs/common";
import { createHash } from "crypto";
import * as password from "./password";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../notifications/email.service";
import { AuditService } from "../audit/audit.service";
import { jwtOptions } from "./auth.module";
import { FREE_FAILURES } from "./login-backoff";

const TEST_SECRET = "0123456789abcdef".repeat(4);
const auditMock = { record: jest.fn() };

/**
 * Unit tests with an in-memory fake for Prisma. Focus: the auth contract
 * (payload shapes match the MSW handlers) + throttling + token rotation.
 */
describe("AuthService", () => {
  let service: AuthService;
  const users = new Map<string, any>();
  const refreshTokens: any[] = [];
  const emailMock = { send: jest.fn() };

  beforeEach(async () => {
    users.clear();
    refreshTokens.length = 0;

    const prismaMock = {
      user: {
        findUnique: jest.fn(({ where }: any) => users.get(where.email) ?? null),
        findUniqueOrThrow: jest.fn(({ where }: any) => {
          for (const u of users.values()) {
            if (u.id === where.id) return Promise.resolve({ ...u, addresses: [] });
          }
          return Promise.reject(new Error("user not found"));
        }),
        create: jest.fn(({ data }: any) => {
          if (users.has(data.email)) throw new Error("unique constraint");
          const user = {
            id: `user_${users.size + 1}`,
            email: data.email,
            passwordHash: data.passwordHash,
            firstName: data.firstName ?? null,
            lastName: data.lastName ?? null,
            role: "CUSTOMER",
            status: "ACTIVE",
            rewardPointsBalance: 0,
            createdAt: new Date("2026-01-01T00:00:00Z"),
            addresses: [],
          };
          users.set(user.email, user);
          return { ...user };
        }),
        update: jest.fn(({ where, data }: any) => {
          const user = Array.from(users.values()).find((u) => u.id === where.id);
          if (user) Object.assign(user, data);
          return user;
        }),
      },
      refreshToken: {
        create: jest.fn(({ data }: any) => {
          const row = { id: `rt_${refreshTokens.length + 1}`, ...data };
          refreshTokens.push(row);
          return row;
        }),
        update: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(() => null),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: new JwtService(jwtOptions(TEST_SECRET)) },
        { provide: EmailService, useValue: emailMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it("register returns a user matching the MSW payload shape", async () => {
    const result = await service.register({
      email: "Jane@Example.com",
      password: "password123",
      fullName: "Jane Doe",
    });

    expect(result.token).toBeTruthy();
    expect(result.refreshToken).toMatch(/^[a-f0-9]{96}$/);
    expect(result.user).toEqual(
      expect.objectContaining({
        email: "jane@example.com",
        fullName: "Jane Doe",
        taxExempt: false,
        taxExemptApproved: false,
        rewardsPoints: 0,
        savedAddresses: [],
        createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
      }),
    );
    // Password is stored hashed.
    expect(users.get("jane@example.com").passwordHash).not.toBe("password123");
  });

  it("register rejects duplicate emails with EMAIL_TAKEN", async () => {
    await service.register({ email: "a@test.com", password: "password123", fullName: "Ann Lee" });
    await expect(
      service.register({ email: "A@test.com", password: "password123", fullName: "Ann Lee" }),
    ).rejects.toThrow(ConflictException);
  });

  it("login returns serialized user and tokens on success, and records lastLoginAt", async () => {
    await service.register({ email: "b@test.com", password: "password123", fullName: "Bob Ray" });
    const result = await service.login({ email: "b@test.com", password: "password123" });
    expect(result.user.fullName).toBe("Bob Ray");
    expect(result.user.mustChangePassword).toBe(false);
    expect(result.token).toContain(".");
    expect(users.get("b@test.com").lastLoginAt).toBeInstanceOf(Date);
  });

  it("login still succeeds for a temporary-password account and flags mustChangePassword", async () => {
    await service.register({ email: "temp@test.com", password: "temporary-pass-1", fullName: "Tem Porary" });
    users.get("temp@test.com").mustChangePassword = true;
    const result = await service.login({ email: "temp@test.com", password: "temporary-pass-1" });
    expect(result.user.mustChangePassword).toBe(true);
    expect(result.token).toContain(".");
  });

  it("access tokens carry only sub and the session id, pinned to HS256 + issuer + audience", async () => {
    const { token } = await service.register({ email: "t@test.com", password: "password123", fullName: "Tia Lo" }, { ip: "203.0.113.9", userAgent: "Mozilla/5.0 (test)" });
    const [header, payload] = token.split(".").slice(0, 2).map((p) => JSON.parse(Buffer.from(p, "base64url").toString()));
    expect(header.alg).toBe("HS256");
    expect(Object.keys(payload).sort()).toEqual(["aud", "exp", "iat", "iss", "sid", "sub"]);
    expect(payload).toMatchObject({ iss: "bannersin48-api", aud: "bannersin48-web", sid: refreshTokens.at(-1)!.id });
    // The session row records where it was opened from, for /users/me/sessions.
    expect(refreshTokens.at(-1)).toMatchObject({ ip: "203.0.113.9", userAgent: "Mozilla/5.0 (test)", lastUsedAt: expect.any(Date) });
  });

  it("login fails cleanly with wrong credentials", async () => {
    await service.register({ email: "c@test.com", password: "password123", fullName: "Cara Fox" });
    await expect(service.login({ email: "c@test.com", password: "wrong" }, "1.1.1.1")).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.login({ email: "c@test.com", password: "password123" }, "1.1.1.1")).resolves.toHaveProperty(
      "token",
    );
  });

  it("backs off an IP+email after repeated failures without locking the account for other IPs", async () => {
    await service.register({ email: "d@test.com", password: "password123", fullName: "Dee Kay" });
    for (let i = 0; i < FREE_FAILURES; i++) {
      await expect(service.login({ email: "d@test.com", password: "wrong" }, "6.6.6.6")).rejects.toThrow(
        UnauthorizedException,
      );
    }
    // The attacker's IP now has to wait, even with the right password…
    const blocked = await service.login({ email: "d@test.com", password: "password123" }, "6.6.6.6").catch((e) => e);
    expect(blocked).toBeInstanceOf(HttpException);
    expect((blocked as HttpException).getStatus()).toBe(429);
    expect((blocked as HttpException).getResponse()).toMatchObject({ code: "LOGIN_BACKOFF" });
    // …but the real owner on another IP signs in normally.
    await expect(service.login({ email: "d@test.com", password: "password123" }, "7.7.7.7")).resolves.toHaveProperty(
      "token",
    );
  });

  it("runs the (dummy) password check even when the email is unknown", async () => {
    const verify = jest.spyOn(password, "verifyPassword");
    await expect(service.login({ email: "ghost@test.com", password: "whatever1" }, "1.1.1.1")).rejects.toThrow(
      UnauthorizedException,
    );
    expect(verify).toHaveBeenCalledWith("whatever1", undefined);
    verify.mockRestore();
  });

  it("rejects a suspended account with the same error as a wrong password", async () => {
    await service.register({ email: "s@test.com", password: "password123", fullName: "Sus Pended" });
    users.get("s@test.com").status = "SUSPENDED";
    await expect(service.login({ email: "s@test.com", password: "password123" }, "1.1.1.1")).rejects.toMatchObject({
      response: { code: "INVALID_CREDENTIALS" },
    });
  });
});

describe("AuthService password reset", () => {
  let service: AuthService;
  let users: Map<string, any>;
  let passwordResets: any[];
  let actionTokens: any[];
  let prismaMock: any;
  const emailMock = { send: jest.fn() };

  beforeEach(async () => {
    users = new Map();
    passwordResets = [];
    actionTokens = [];
    emailMock.send.mockClear();
    auditMock.record.mockClear();

    prismaMock = {
      user: {
        findUnique: jest.fn(({ where }: any) => users.get(where.email) ?? null),
        findUniqueOrThrow: jest.fn(({ where }: any) => {
          const user = Array.from(users.values()).find((u) => u.id === where.id);
          return user ? Promise.resolve({ ...user, addresses: [] }) : Promise.reject(new Error("user not found"));
        }),
        create: jest.fn(({ data }: any) => {
          const user = {
            id: `user_${users.size + 1}`,
            email: data.email,
            passwordHash: data.passwordHash,
            firstName: data.firstName ?? null,
            lastName: data.lastName ?? null,
            role: "CUSTOMER",
            status: "ACTIVE",
            rewardPointsBalance: 0,
            createdAt: new Date("2026-01-01T00:00:00Z"),
            addresses: [],
          };
          users.set(user.email, user);
          return { ...user };
        }),
        update: jest.fn(({ where, data }: any) => {
          const user = Array.from(users.values()).find((u) => u.id === where.id);
          if (!user) throw new Error("user not found");
          Object.assign(user, data);
          return user;
        }),
      },
      refreshToken: {
        create: jest.fn(({ data }: any) => ({ id: "rt_1", ...data })),
        update: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(() => null),
      },
      passwordReset: {
        create: jest.fn(({ data }: any) => {
          const record = { id: `pr_${passwordResets.length + 1}`, ...data };
          passwordResets.push(record);
          return record;
        }),
        findUnique: jest.fn(({ where }: any) => passwordResets.find((r) => r.tokenHash === where.tokenHash) ?? null),
        update: jest.fn(({ where, data }: any) => {
          const rec = passwordResets.find((r) => r.id === where.id);
          Object.assign(rec, data);
          return rec;
        }),
      },
      actionToken: {
        findUnique: jest.fn(({ where }: any) => {
          const row = actionTokens.find((t) => t.tokenHash === where.tokenHash);
          if (!row) return null;
          const user = Array.from(users.values()).find((u) => u.id === row.userId);
          return { ...row, user: { id: user.id, email: user.email, status: user.status } };
        }),
        update: jest.fn(({ where, data }: any) => Object.assign(actionTokens.find((t) => t.id === where.id), data)),
        updateMany: jest.fn(({ where, data }: any) => {
          for (const t of actionTokens) if (t.userId === where.userId && t.purpose === where.purpose && t.usedAt === null) Object.assign(t, data);
        }),
      },
      $transaction: jest.fn((arg: any) => (typeof arg === "function" ? arg(prismaMock) : Promise.all(arg))),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: new JwtService(jwtOptions(TEST_SECRET)) },
        { provide: EmailService, useValue: emailMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  function seedInvite(userId: string, rawToken: string, overrides: Record<string, unknown> = {}) {
    const row = {
      id: `at_${actionTokens.length + 1}`,
      userId,
      purpose: "STAFF_INVITE",
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      requestedBy: "admin_1",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: null,
      ...overrides,
    };
    actionTokens.push(row);
    return row;
  }

  it("acceptInvite activates an INVITED staff account, burns the token, revokes sessions, audits and signs in", async () => {
    await service.register({ email: "new.staff@test.com", password: "unusable-placeholder-hash", fullName: "New Staff" });
    const invited = users.get("new.staff@test.com");
    Object.assign(invited, { status: "INVITED", role: "STAFF", mustChangePassword: false });
    const raw = "b".repeat(64);
    const invite = seedInvite(invited.id, raw);

    const result = await service.acceptInvite(raw, "a-long-enough-password", "203.0.113.4");
    expect(result.token).toContain(".");
    expect(result.user.email).toBe("new.staff@test.com");
    expect(invited.status).toBe("ACTIVE");
    expect(invited.emailVerifiedAt).toBeInstanceOf(Date);
    expect(invited.passwordHash).not.toBe("unusable-placeholder-hash");
    expect(invite.usedAt).toBeInstanceOf(Date);
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({ where: { userId: invited.id, revokedAt: null }, data: { revokedAt: expect.any(Date) } });
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: invited.id, action: "user.accept_invite", entityId: invited.id, ip: "203.0.113.4" }),
      prismaMock,
    );

    // Single use.
    await expect(service.acceptInvite(raw, "another-long-password")).rejects.toMatchObject({ response: { code: "INVITE_INVALID" } });
  });

  it("acceptInvite gives the same neutral error for unknown, expired, used and non-invite tokens", async () => {
    await service.register({ email: "s@test.com", password: "placeholder-hash-xx", fullName: "Some One" });
    const user = users.get("s@test.com");
    const expired = "c".repeat(64);
    seedInvite(user.id, expired, { expiresAt: new Date(Date.now() - 1000) });
    const used = "d".repeat(64);
    seedInvite(user.id, used, { usedAt: new Date() });
    const wrongPurpose = "e".repeat(64);
    seedInvite(user.id, wrongPurpose, { purpose: "EMAIL_VERIFY" });

    for (const token of ["f".repeat(64), expired, used, wrongPurpose]) {
      await expect(service.acceptInvite(token, "a-long-enough-password")).rejects.toMatchObject({ response: { code: "INVITE_INVALID" } });
    }
    expect(auditMock.record).not.toHaveBeenCalled();
  });

  it("forgotPassword always succeeds and records a hashed token for a known account", async () => {
    await service.register({ email: "reset@test.com", password: "oldpassword123", fullName: "Reset User" });
    const known = users.get("reset@test.com");

    const result = await service.forgotPassword("RESET@test.com");
    expect(result).toEqual({ ok: true });
    expect(passwordResets).toHaveLength(1);
    expect(passwordResets[0].userId).toBe(known.id);
    // Tokens are stored hashed (sha256 hex), never as the raw reset token.
    expect(passwordResets[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(passwordResets[0].expiresAt.getTime()).toBeGreaterThan(Date.now());

    // The raw token goes only to the email transport, which redacts it before logging.
    expect(emailMock.send).toHaveBeenCalledWith({
      to: "reset@test.com",
      template: "password_reset",
      payload: { resetToken: expect.stringMatching(/^[a-f0-9]{64}$/) },
    });
    const sentToken = emailMock.send.mock.calls[0][0].payload.resetToken;
    expect(passwordResets[0].tokenHash).toBe(createHash("sha256").update(sentToken).digest("hex"));

    // No account enumeration: an unknown email yields the identical response.
    expect(await service.forgotPassword("nobody@test.com")).toEqual({ ok: true });
    expect(passwordResets).toHaveLength(1);
    expect(emailMock.send).toHaveBeenCalledTimes(1);
  });

  it("resetPassword rejects unknown and expired tokens", async () => {
    await service.register({ email: "reset@test.com", password: "oldpassword123", fullName: "Reset User" });

    await expect(service.resetPassword("e".repeat(64), "newpassword123")).rejects.toThrow(BadRequestException);

    const expired = "f".repeat(64);
    passwordResets.push({
      id: "pr_expired",
      userId: users.get("reset@test.com").id,
      tokenHash: createHash("sha256").update(expired).digest("hex"),
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });
    await expect(service.resetPassword(expired, "newpassword123")).rejects.toThrow(BadRequestException);
  });

  it("resetPassword updates the password, marks the token used, and revokes sessions", async () => {
    await service.register({ email: "reset@test.com", password: "oldpassword123", fullName: "Reset User" });
    const known = users.get("reset@test.com");
    const rawToken = "a".repeat(64);
    passwordResets.push({
      id: "pr_valid",
      userId: known.id,
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: null,
    });

    const result = await service.resetPassword(rawToken, "newpassword123");
    expect(result).toEqual({ ok: true });
    expect(known.passwordHash).not.toBe("oldpassword123");
    expect(passwordResets.find((r) => r.id === "pr_valid").usedAt).toBeInstanceOf(Date);
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: known.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });

    // A reset token is single-use.
    await expect(service.resetPassword(rawToken, "newpassword456")).rejects.toThrow(BadRequestException);
  });

  function seedActionToken(userId: string, rawToken: string, purpose: string, payload: unknown, overrides: Record<string, unknown> = {}) {
    const row = {
      id: `at_${actionTokens.length + 1}`,
      userId,
      purpose,
      payload,
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      requestedBy: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: null,
      ...overrides,
    };
    actionTokens.push(row);
    return row;
  }

  it("confirmEmailChange swaps the address, verifies it, clears pendingEmail, revokes sessions, audits and notifies the old address", async () => {
    await service.register({ email: "old@test.com", password: "password123", fullName: "Old Mail" });
    const user = users.get("old@test.com");
    user.pendingEmail = "new@test.com";
    const raw = "1".repeat(64);
    const token = seedActionToken(user.id, raw, "EMAIL_CHANGE", { newEmail: "new@test.com" });
    emailMock.send.mockClear();

    await expect(service.confirmEmailChange(raw, "203.0.113.5")).resolves.toEqual({ ok: true, email: "new@test.com" });
    expect(user.email).toBe("new@test.com");
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(user.pendingEmail).toBeNull();
    expect(token.usedAt).toBeInstanceOf(Date);
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: expect.any(Date) } });
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: user.id, action: "user.email_changed", entityId: user.id, diff: { email: { from: "old@test.com", to: "new@test.com" }, sessionsRevoked: true }, ip: "203.0.113.5" }),
      prismaMock,
    );
    expect(emailMock.send).toHaveBeenCalledWith({ to: "old@test.com", template: "email_changed_notice", payload: { newEmail: "new@test.com" } });

    // Single use.
    await expect(service.confirmEmailChange(raw)).rejects.toMatchObject({ response: { code: "TOKEN_INVALID" } });
  });

  it("confirmEmailChange answers EMAIL_TAKEN when the address was claimed meanwhile, and the neutral error for bad tokens", async () => {
    await service.register({ email: "a1@test.com", password: "password123", fullName: "A One" });
    await service.register({ email: "taken@test.com", password: "password123", fullName: "Tak En" });
    const user = users.get("a1@test.com");
    const raw = "2".repeat(64);
    seedActionToken(user.id, raw, "EMAIL_CHANGE", { newEmail: "taken@test.com" });
    await expect(service.confirmEmailChange(raw)).rejects.toMatchObject({ response: { code: "EMAIL_TAKEN" } });
    expect(user.email).toBe("a1@test.com");

    const expired = "3".repeat(64);
    seedActionToken(user.id, expired, "EMAIL_CHANGE", { newEmail: "x@test.com" }, { expiresAt: new Date(Date.now() - 1000) });
    const wrongPurpose = "4".repeat(64);
    seedActionToken(user.id, wrongPurpose, "STAFF_INVITE", null);
    const noPayload = "5".repeat(64);
    seedActionToken(user.id, noPayload, "EMAIL_CHANGE", null);
    for (const token of ["9".repeat(64), expired, wrongPurpose, noPayload]) {
      await expect(service.confirmEmailChange(token)).rejects.toMatchObject({ response: { code: "TOKEN_INVALID" } });
    }
    expect(auditMock.record).not.toHaveBeenCalled();
  });

  it("verifyEmail marks the address verified only when the token was issued for the current address", async () => {
    await service.register({ email: "v@test.com", password: "password123", fullName: "Ver Ify" });
    const user = users.get("v@test.com");
    const stale = "6".repeat(64);
    seedActionToken(user.id, stale, "EMAIL_VERIFY", { email: "previous@test.com" });
    await expect(service.verifyEmail(stale)).rejects.toMatchObject({ response: { code: "TOKEN_INVALID" } });
    expect(user.emailVerifiedAt).toBeUndefined();

    const raw = "7".repeat(64);
    const token = seedActionToken(user.id, raw, "EMAIL_VERIFY", { email: "v@test.com" });
    await expect(service.verifyEmail(raw, "203.0.113.6")).resolves.toEqual({ ok: true });
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(token.usedAt).toBeInstanceOf(Date);
    expect(auditMock.record).toHaveBeenCalledWith(expect.objectContaining({ action: "user.email_verified", entityId: user.id, ip: "203.0.113.6" }), prismaMock);
    await expect(service.verifyEmail(raw)).rejects.toMatchObject({ response: { code: "TOKEN_INVALID" } });
  });
});
