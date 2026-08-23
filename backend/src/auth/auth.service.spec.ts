import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
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
