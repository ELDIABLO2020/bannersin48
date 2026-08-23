import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { serializeUser, type SerializedUser } from "../common/user.serializer";
import type { RegisterDto, LoginDto } from "./auth.dto";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_DAYS = 30;
const BCRYPT_ROUNDS = 10;

// Login throttling: lock an email for 15 minutes after 5 failed attempts.
const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

interface LoginAttempt {
  failures: number;
  lockedUntil: number | null;
}

export interface TokenPair {
  token: string; // access token — field name matches the MSW contract
  refreshToken: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

@Injectable()
export class AuthService {
  private loginAttempts = new Map<string, LoginAttempt>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // --- Registration & login -------------------------------------------------

  async register(dto: RegisterDto): Promise<{ user: SerializedUser } & TokenPair> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({ code: "EMAIL_TAKEN", message: "An account with that email already exists." });
    }

    const { firstName, lastName } = splitFullName(dto.fullName);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        firstName,
        lastName,
      },
    });

    return { user: await this.serialize(user.id), ...(await this.issueTokens(user)) };
  }

  async login(dto: LoginDto): Promise<{ user: SerializedUser } & TokenPair> {
    const email = dto.email.toLowerCase().trim();
    this.assertNotLocked(email);

    const user = await this.prisma.user.findUnique({ where: { email } });
    const passwordOk =
      user && user.status === "ACTIVE" ? await bcrypt.compare(dto.password, user.passwordHash) : false;

    if (!user || !passwordOk) {
      this.recordFailure(email);
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      });
    }

    this.loginAttempts.delete(email);
    return { user: await this.serialize(user.id), ...(await this.issueTokens(user)) };
  }

  // --- Session --------------------------------------------------------------

  async me(userId: string): Promise<SerializedUser> {
    return this.serialize(userId);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash: sha256(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    }
    // No specific token supplied → revoke every session for this user.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Rotate a refresh token: the old one is revoked and cannot be reused. */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });

    if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date() || stored.user.status !== "ACTIVE") {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user);
  }

  // --- Password reset ---------------------------------------------------------

  /**
   * Always succeeds (no account enumeration). In Phase 0 the reset link/token
   * is logged to the server console; SES email delivery arrives in Phase 2.
   */
  async forgotPassword(email: string): Promise<{ ok: true }> {
    const normalized = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user) return { ok: true };

    const rawToken = randomBytes(32).toString("hex");
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });
    console.log(`[auth] Password reset requested for ${normalized}. Reset token (dev only): ${rawToken}`);
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ ok: true }> {
    const record = await this.prisma.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
    if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
      throw new BadRequestException("This password reset link is invalid or has expired.");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
      }),
      this.prisma.passwordReset.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Force re-login everywhere after a password change.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  // --- Internals --------------------------------------------------------------

  private async serialize(userId: string): Promise<SerializedUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { addresses: { orderBy: { createdAt: "asc" } } },
    });
    return serializeUser(
      user,
      user.addresses.map((a) => ({
        id: a.id,
        label: a.label,
        line1: a.line1,
        line2: a.line2,
        city: a.city,
        state: a.state,
        zip: a.zip,
        country: a.country,
      })),
    );
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    role: string;
  }): Promise<TokenPair> {
    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });

    const refreshToken = randomBytes(48).toString("hex");
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return { token, refreshToken };
  }

  // --- Login throttling ---------------------------------------------------

  private assertNotLocked(email: string): void {
    const attempt = this.loginAttempts.get(email);
    if (attempt?.lockedUntil && attempt.lockedUntil > Date.now()) {
      throw new UnauthorizedException("Too many login attempts. Try again in 15 minutes.");
    }
  }

  private recordFailure(email: string): void {
    const attempt = this.loginAttempts.get(email) ?? { failures: 0, lockedUntil: null };
    attempt.failures += 1;
    if (attempt.failures >= MAX_LOGIN_FAILURES) {
      attempt.lockedUntil = Date.now() + LOGIN_LOCK_MS;
      attempt.failures = 0;
    }
    this.loginAttempts.set(email, attempt);
  }
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1)! };
}

export { ACCESS_TOKEN_TTL_SECONDS };
