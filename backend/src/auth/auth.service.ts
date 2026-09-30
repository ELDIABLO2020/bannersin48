import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../notifications/email.service";
import { serializeAddress, serializeUser, type SerializedUser } from "../common/user.serializer";
import { hashPassword, verifyPassword } from "./password";
import { LoginBackoff } from "./login-backoff";
import type { RegisterDto, LoginDto } from "./auth.dto";

const REFRESH_TOKEN_TTL_DAYS = 30;

export interface TokenPair {
  token: string; // access token — field name matches the MSW contract
  refreshToken: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

@Injectable()
export class AuthService {
  private readonly backoff = new LoginBackoff();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
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
        passwordHash: await hashPassword(dto.password),
        firstName,
        lastName,
      },
    });

    return { user: await this.serialize(user.id), ...(await this.issueTokens(user)) };
  }

  async login(dto: LoginDto, ip?: string): Promise<{ user: SerializedUser } & TokenPair> {
    const email = dto.email.toLowerCase().trim();
    const key = LoginBackoff.key(ip, email);
    const waitMs = this.backoff.retryAfterMs(key);
    if (waitMs > 0) {
      const seconds = Math.ceil(waitMs / 1000);
      throw new HttpException(
        {
          code: "LOGIN_BACKOFF",
          message: `Too many failed sign-in attempts. Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`,
          retryAfterSeconds: seconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always run bcrypt, even with no user, so response time doesn't reveal which emails exist.
    const passwordOk = await verifyPassword(dto.password, user?.passwordHash);

    if (!user || !passwordOk || user.status !== "ACTIVE") {
      this.backoff.recordFailure(key);
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      });
    }

    this.backoff.recordSuccess(key);
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
   * Always succeeds (no account enumeration). The token goes to EmailService,
   * which only logs a redacted fingerprint; until a real transport exists,
   * operators reset passwords with the `admin:reset-password` CLI.
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
    await this.email.send({ to: user.email, template: "password_reset", payload: { resetToken: rawToken } });
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
        data: { passwordHash: await hashPassword(newPassword) },
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
      user.addresses.map(serializeAddress),
    );
  }

  private async issueTokens(user: { id: string }): Promise<TokenPair> {
    // `sub` only: JwtAuthGuard re-reads role and status from the database on every request.
    const token = this.jwt.sign({ sub: user.id });

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
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1)! };
}
