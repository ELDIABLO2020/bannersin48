import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { createHash } from "crypto";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Unit tests with an in-memory fake for Prisma. Focus: the auth contract
 * (payload shapes match the MSW handlers) + throttling + token rotation.
 */
describe("AuthService", () => {
  let service: AuthService;
  const users = new Map<string, any>();
  const refreshTokens: any[] = [];

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
      },
      refreshToken: {
        create: jest.fn(({ data }: any) => {
          refreshTokens.push(data);
          return data;
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
        { provide: JwtService, useValue: new JwtService({ secret: "test-secret" }) },
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

  it("login returns serialized user and tokens on success", async () => {
    await service.register({ email: "b@test.com", password: "password123", fullName: "Bob Ray" });
    const result = await service.login({ email: "b@test.com", password: "password123" });
    expect(result.user.fullName).toBe("Bob Ray");
    expect(result.token).toContain(".");
  });

  it("login fails cleanly with wrong credentials and locks after 5 failures", async () => {
    await service.register({ email: "c@test.com", password: "password123", fullName: "Cara Fox" });
    for (let i = 0; i < 5; i++) {
      await expect(service.login({ email: "c@test.com", password: "wrong" })).rejects.toThrow(
        UnauthorizedException,
      );
    }
    // Even the correct password is now locked out.
    await expect(service.login({ email: "c@test.com", password: "password123" })).rejects.toThrow(
      /Too many login attempts/,
    );
  });
});

describe("AuthService password reset", () => {
  let service: AuthService;
  let users: Map<string, any>;
  let passwordResets: any[];
  let prismaMock: any;

  beforeEach(async () => {
    users = new Map();
    passwordResets = [];

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
        create: jest.fn(),
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
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: new JwtService({ secret: "test-secret" }) },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
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

    // No account enumeration: an unknown email yields the identical response.
    expect(await service.forgotPassword("nobody@test.com")).toEqual({ ok: true });
    expect(passwordResets).toHaveLength(1);
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
});
