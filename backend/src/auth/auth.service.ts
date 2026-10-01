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
import { AuditService } from "../audit/audit.service";
import { serializeAddress, serializeUser, type SerializedUser } from "../common/user.serializer";
import { rbacUserInclude } from "../rbac/rbac.service";
import { CUSTOMER_ROLE_KEY } from "../rbac/permissions";
import { hashPassword, verifyPassword } from "./password";
import { LoginBackoff } from "./login-backoff";
import type { RegisterDto, LoginDto } from "./auth.dto";

const REFRESH_TOKEN_TTL_DAYS = 30;
export const EMAIL_CHANGE_TTL_HOURS = 1;
export const EMAIL_VERIFY_TTL_HOURS = 24;

export interface TokenPair {
  token: string; // access token — field name matches the MSW contract
  refreshToken: string;
}

/** Where a session was opened from; shown back to the user in `/users/me/sessions`. */
export interface SessionMeta {
  ip?: string | null;
  userAgent?: string | null;
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
    private readonly audit: AuditService,
  ) {}

  // --- Registration & login -------------------------------------------------

  async register(dto: RegisterDto, meta: SessionMeta = {}): Promise<{ user: SerializedUser } & TokenPair> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({ code: "EMAIL_TAKEN", message: "An account with that email already exists." });
    }

    const { firstName, lastName } = splitFullName(dto.fullName);
    // Every account holds exactly one access role (user.roleId is NOT NULL):
    // storefront sign-ups get the immutable, empty `customer` system role.
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(dto.password),
        firstName,
        lastName,
        role: "CUSTOMER",
        accessRole: { connect: { key: CUSTOMER_ROLE_KEY } },
      },
    });

    return { user: await this.serialize(user.id), ...(await this.issueTokens(user, meta)) };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<{ user: SerializedUser } & TokenPair> {
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
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    // A temporary-password account signs in normally; the guard then limits it to
    // sign-out and POST /users/me/password until `mustChangePassword` clears.
    return { user: await this.serialize(user.id), ...(await this.issueTokens(user, { ip, userAgent })) };
  }

  /**
   * Public: redeems a STAFF_INVITE action token. Sets the first real password,
   * activates the account (INVITED → ACTIVE), marks the email verified, burns
   * the token, revokes any sessions and signs the user in. Neutral errors: a
   * wrong, used or expired token all read the same.
   */
  async acceptInvite(token: string, password: string, ip?: string, userAgent?: string): Promise<{ user: SerializedUser } & TokenPair> {
    const invite = await this.prisma.actionToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { select: { id: true, status: true } } },
    });
    const now = new Date();
    if (!invite || invite.purpose !== "STAFF_INVITE" || invite.usedAt !== null || invite.expiresAt < now || invite.user.status === "SUSPENDED") {
      throw new BadRequestException({ code: "INVITE_INVALID", message: "This invite link is invalid or has expired." });
    }

    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: invite.userId },
        data: { passwordHash, status: "ACTIVE", emailVerifiedAt: now, passwordChangedAt: now, mustChangePassword: false, lastLoginAt: now },
      });
      await tx.actionToken.update({ where: { id: invite.id }, data: { usedAt: now } });
      await tx.actionToken.updateMany({ where: { userId: invite.userId, purpose: "STAFF_INVITE", usedAt: null }, data: { usedAt: now } });
      await tx.refreshToken.updateMany({ where: { userId: invite.userId, revokedAt: null }, data: { revokedAt: now } });
      await this.audit.record(
        {
          actorId: invite.userId,
          action: "user.accept_invite",
          entityType: "user",
          entityId: invite.userId,
          diff: { status: { from: "INVITED", to: "ACTIVE" }, passwordChanged: true, invitedBy: invite.requestedBy },
          ip,
        },
        tx,
      );
    });

    return { user: await this.serialize(invite.userId), ...(await this.issueTokens({ id: invite.userId }, { ip, userAgent })) };
  }

  // --- Email change & verification (plan §4.2; links only reach EmailService) ---

  /**
   * Public: redeems an EMAIL_CHANGE token minted by `POST /users/me/email`.
   * Swaps the address, marks it verified, clears `pendingEmail`, burns the
   * token, signs every session out and audits. Neutral error for a wrong,
   * used or expired token; `409 EMAIL_TAKEN` only if the address was claimed
   * meanwhile (the holder already proved control of it).
   */
  async confirmEmailChange(token: string, ip?: string): Promise<{ ok: true; email: string }> {
    const now = new Date();
    const record = await this.loadActionToken(token, "EMAIL_CHANGE", now);
    const newEmail = (record.payload as { newEmail?: unknown } | null)?.newEmail;
    if (typeof newEmail !== "string" || newEmail.length === 0) throw invalidActionToken();

    const taken = await this.prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (taken && taken.id !== record.userId) {
      throw new ConflictException({ code: "EMAIL_TAKEN", message: "An account with that email already exists." });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { email: newEmail, emailVerifiedAt: now, pendingEmail: null },
      });
      await tx.actionToken.updateMany({ where: { userId: record.userId, purpose: "EMAIL_CHANGE", usedAt: null }, data: { usedAt: now } });
      await tx.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: now } });
      await this.audit.record(
        {
          actorId: record.userId,
          action: "user.email_changed",
          entityType: "user",
          entityId: record.userId,
          diff: { email: { from: record.user.email, to: newEmail }, sessionsRevoked: true },
          ip,
        },
        tx,
      );
    });
    // Security notice to the previous address (transactional mail always sends).
    await this.email.send({ to: record.user.email, template: "email_changed_notice", payload: { newEmail } });
    return { ok: true, email: newEmail };
  }

  /** Public: redeems an EMAIL_VERIFY token. Only verifies the address the token was issued for. */
  async verifyEmail(token: string, ip?: string): Promise<{ ok: true }> {
    const now = new Date();
    const record = await this.loadActionToken(token, "EMAIL_VERIFY", now);
    const forEmail = (record.payload as { email?: unknown } | null)?.email;
    // The address changed since the link went out: the link proves nothing about the new one.
    if (typeof forEmail !== "string" || forEmail !== record.user.email) throw invalidActionToken();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: now } });
      await tx.actionToken.updateMany({ where: { userId: record.userId, purpose: "EMAIL_VERIFY", usedAt: null }, data: { usedAt: now } });
      await this.audit.record(
        { actorId: record.userId, action: "user.email_verified", entityType: "user", entityId: record.userId, diff: { email: forEmail }, ip },
        tx,
      );
    });
    return { ok: true };
  }

  private async loadActionToken(token: string, purpose: "EMAIL_CHANGE" | "EMAIL_VERIFY", now: Date) {
    const record = await this.prisma.actionToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { select: { id: true, email: true, status: true } } },
    });
    if (!record || record.purpose !== purpose || record.usedAt !== null || record.expiresAt < now || record.user.status === "SUSPENDED") {
      throw invalidActionToken();
    }
    return record;
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
  async refresh(refreshToken: string, meta: SessionMeta = {}): Promise<TokenPair> {
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

    // The rotated session keeps its origin unless the request says otherwise.
    return this.issueTokens(stored.user, { ip: meta.ip ?? stored.ip, userAgent: meta.userAgent ?? stored.userAgent });
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
      include: { addresses: { orderBy: { createdAt: "asc" } }, ...rbacUserInclude() },
    });
    return serializeUser(
      user,
      user.addresses.map(serializeAddress),
    );
  }

  private async issueTokens(user: { id: string }, meta: SessionMeta = {}): Promise<TokenPair> {
    const refreshToken = randomBytes(48).toString("hex");
    const now = new Date();
    const session = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
        ip: meta.ip?.slice(0, 64) ?? null,
        userAgent: meta.userAgent?.slice(0, 256) ?? null,
        lastUsedAt: now,
      },
      select: { id: true },
    });

    // `sub` + the session id only: JwtAuthGuard re-reads role, permissions and
    // status from the database on every request; `sid` grants nothing.
    const token = this.jwt.sign({ sub: user.id, sid: session.id });
    return { token, refreshToken };
  }
}

function invalidActionToken(): BadRequestException {
  return new BadRequestException({ code: "TOKEN_INVALID", message: "This link is invalid or has expired." });
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1)! };
}
