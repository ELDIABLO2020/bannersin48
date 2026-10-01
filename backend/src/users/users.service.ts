import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../notifications/email.service";
import { serializeAddress, serializeUser, type SerializedUser, type SerializedAddress } from "../common/user.serializer";
import { rbacUserInclude } from "../rbac/rbac.service";
import { EMAIL_CHANGE_TTL_HOURS, EMAIL_VERIFY_TTL_HOURS } from "../auth/auth.service";
import { hashPassword, verifyPassword } from "../auth/password";
import { passwordProblem } from "../cli/reset-password";
import type { AddressDto, ChangeEmailDto, ChangePasswordDto, RewardsQueryDto, UpdateProfileDto, UpdateSettingsDto } from "./users.dto";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** One signed-in device, as `GET /users/me/sessions` lists it. Never the token itself. */
export interface SessionSummary {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  userAgent: string | null;
  /** Network, not host: IPv4 masked to /24, IPv6 to /64. */
  ip: string | null;
  /** The session that made this request (from the access token's `sid`). */
  current: boolean;
}

export interface RewardLedgerEntry {
  id: string;
  deltaCents: number;
  reason: string;
  orderId: string | null;
  orderNumber: string | null;
  createdAt: string;
}

export interface RewardsPage {
  balanceCents: number;
  page: number;
  pageSize: number;
  total: number;
  ledger: RewardLedgerEntry[];
}

/** Drops the host part of an address so the sessions list shows a network, not a device. */
export function maskIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/.exec(ip);
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0/24`;
  if (ip.includes(":")) {
    const groups = ip.split("::")[0]!.split(":").filter(Boolean).slice(0, 4);
    return `${groups.join(":")}::/64`;
  }
  return null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
  ) {}

  /**
   * Signed-in password change. Verifies the current password first (a wrong
   * one changes nothing and revokes nothing), then sets the new hash, clears
   * `mustChangePassword`, revokes every refresh token except the one presented
   * as `keepRefreshToken`, and audits `user.change_password` in the same
   * transaction. Staff accounts must meet the operator password rules.
   */
  async changePassword(userId: string, dto: ChangePasswordDto, ip?: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const currentOk = await verifyPassword(dto.currentPassword, user.passwordHash);
    if (!currentOk) {
      throw new BadRequestException({ code: "INVALID_CURRENT_PASSWORD", message: "Your current password is incorrect." });
    }
    if (user.role !== "CUSTOMER") {
      const problem = passwordProblem(dto.newPassword);
      if (problem) throw new BadRequestException({ code: "WEAK_PASSWORD", message: problem });
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException({ code: "PASSWORD_REUSED", message: "Choose a password you have not used before." });
    }

    const passwordHash = await hashPassword(dto.newPassword);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash, passwordChangedAt: now, mustChangePassword: false },
      });
      await tx.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
          ...(dto.keepRefreshToken ? { NOT: { tokenHash: sha256(dto.keepRefreshToken) } } : {}),
        },
        data: { revokedAt: now },
      });
      await this.audit.record(
        {
          actorId: userId,
          action: "user.change_password",
          entityType: "user",
          entityId: userId,
          diff: { passwordChanged: true, firstLogin: user.mustChangePassword },
          ip,
        },
        tx,
      );
    });
    return { ok: true };
  }

  async getProfile(userId: string): Promise<SerializedUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { addresses: { orderBy: [{ isDefaultShipping: "desc" }, { createdAt: "asc" }] }, ...rbacUserInclude() },
    });
    return serializeUser(user, user.addresses.map(serializeAddress));
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SerializedUser> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
      },
    });
    return this.getProfile(userId);
  }

  /** Notification toggles only; security mail (password, email change) always sends. */
  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<SerializedUser> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.notifyOrderUpdates !== undefined ? { notifyOrderUpdates: dto.notifyOrderUpdates } : {}),
        ...(dto.notifyMarketing !== undefined ? { notifyMarketing: dto.notifyMarketing } : {}),
      },
    });
    return this.getProfile(userId);
  }

  // --- Email change & verification ---------------------------------------------

  /**
   * Starts an email change. The password is verified before anything about
   * `newEmail` is revealed (no enumeration before auth). Writes `pendingEmail`
   * and a 1-hour EMAIL_CHANGE token that only ever reaches EmailService: the
   * new address gets the confirmation link, the old one a notice. Audited.
   */
  async requestEmailChange(userId: string, dto: ChangeEmailDto, ip?: string): Promise<{ ok: true; pendingEmail: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const currentOk = await verifyPassword(dto.currentPassword, user.passwordHash);
    if (!currentOk) {
      throw new BadRequestException({ code: "INVALID_CURRENT_PASSWORD", message: "Your current password is incorrect." });
    }
    const newEmail = dto.newEmail.toLowerCase().trim();
    if (newEmail === user.email) {
      throw new BadRequestException({ code: "EMAIL_UNCHANGED", message: "That is already the email on this account." });
    }
    const taken = await this.prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (taken) {
      throw new ConflictException({ code: "EMAIL_TAKEN", message: "An account with that email already exists." });
    }

    const rawToken = randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EMAIL_CHANGE_TTL_HOURS * 60 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { pendingEmail: newEmail } });
      await tx.actionToken.updateMany({ where: { userId, purpose: "EMAIL_CHANGE", usedAt: null }, data: { usedAt: now } });
      await tx.actionToken.create({
        data: { userId, purpose: "EMAIL_CHANGE", tokenHash: sha256(rawToken), payload: { newEmail }, expiresAt },
      });
      await this.audit.record(
        { actorId: userId, action: "user.email_change_requested", entityType: "user", entityId: userId, diff: { email: { from: user.email, to: newEmail } }, ip },
        tx,
      );
    });
    await this.email.send({ to: newEmail, template: "email_change_confirm", payload: { confirmToken: rawToken, expiresAt: expiresAt.toISOString() } });
    await this.email.send({ to: user.email, template: "email_change_requested_notice", payload: { newEmail } });
    return { ok: true, pendingEmail: newEmail };
  }

  /** Re-sends the EMAIL_VERIFY link for the current address (24 h, single use). */
  async resendVerification(userId: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerifiedAt) {
      throw new ConflictException({ code: "ALREADY_VERIFIED", message: "This email is already verified." });
    }
    const rawToken = randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.actionToken.updateMany({ where: { userId, purpose: "EMAIL_VERIFY", usedAt: null }, data: { usedAt: now } });
      await tx.actionToken.create({
        data: { userId, purpose: "EMAIL_VERIFY", tokenHash: sha256(rawToken), payload: { email: user.email }, expiresAt },
      });
    });
    await this.email.send({ to: user.email, template: "email_verify", payload: { verifyToken: rawToken, expiresAt: expiresAt.toISOString() } });
    return { ok: true };
  }

  // --- Sessions -------------------------------------------------------------

  /** Live sessions (refresh tokens not revoked or expired), most recently used first. */
  async listSessions(userId: string, currentSessionId: string | null): Promise<SessionSummary[]> {
    const now = new Date();
    const rows = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
      expiresAt: r.expiresAt.toISOString(),
      userAgent: r.userAgent,
      ip: maskIp(r.ip),
      current: r.id === currentSessionId,
    }));
  }

  /** Revokes one of the caller's own sessions. Another user's session reads as not found. */
  async revokeSession(userId: string, sessionId: string): Promise<{ ok: true }> {
    if (!sessionId) throw new BadRequestException("Session id is required.");
    const row = await this.prisma.refreshToken.findUnique({ where: { id: sessionId }, select: { id: true, userId: true } });
    if (!row || row.userId !== userId) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Session not found." });
    }
    await this.prisma.refreshToken.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  /** "Sign out other devices": everything except the session that made the request. */
  async revokeOtherSessions(userId: string, currentSessionId: string | null, ip?: string): Promise<{ revoked: number }> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null, ...(currentSessionId ? { NOT: { id: currentSessionId } } : {}) },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({ actorId: userId, action: "user.revoke_sessions", entityType: "user", entityId: userId, diff: { revoked: count, keptCurrent: Boolean(currentSessionId) }, ip });
    return { revoked: count };
  }

  // --- Rewards (read-only for the customer) -----------------------------------

  async getRewards(userId: string, query: RewardsQueryDto): Promise<RewardsPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const [user, total, rows] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { rewardPointsBalance: true } }),
      this.prisma.rewardLedger.count({ where: { userId } }),
      this.prisma.rewardLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { order: { select: { number: true } } },
      }),
    ]);
    return {
      balanceCents: user.rewardPointsBalance,
      page,
      pageSize,
      total,
      // `createdBy` (the adjusting staff member) is never exposed, like order events' actor.
      ledger: rows.map((r) => ({
        id: r.id,
        deltaCents: r.deltaCents,
        reason: r.reason,
        orderId: r.orderId,
        orderNumber: r.order?.number ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  // --- Address book ---------------------------------------------------------

  async listAddresses(userId: string): Promise<SerializedAddress[]> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefaultShipping: "desc" }, { createdAt: "asc" }],
    });
    return addresses.map(serializeAddress);
  }

  async createAddress(userId: string, dto: AddressDto): Promise<SerializedAddress> {
    const address = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefaultShipping) {
        await tx.address.updateMany({ where: { userId }, data: { isDefaultShipping: false } });
      }
      const count = await tx.address.count({ where: { userId } });
      return tx.address.create({
        data: {
          userId,
          label: dto.label,
          line1: dto.line1.trim(),
          line2: dto.line2?.trim(),
          city: dto.city.trim(),
          state: dto.state.toUpperCase().trim(),
          zip: dto.zip.trim(),
          country: (dto.country ?? "US").toUpperCase(),
          // First address added becomes the default automatically.
          isDefaultShipping: dto.isDefaultShipping ?? count === 0,
        },
      });
    });
    return serializeAddress(address);
  }

  async updateAddress(userId: string, addressId: string, dto: AddressDto): Promise<SerializedAddress> {
    await this.assertOwnership(userId, addressId);
    const address = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefaultShipping) {
        await tx.address.updateMany({ where: { userId }, data: { isDefaultShipping: false } });
      }
      return tx.address.update({
        where: { id: addressId },
        data: {
          label: dto.label,
          line1: dto.line1.trim(),
          line2: dto.line2?.trim(),
          city: dto.city.trim(),
          state: dto.state.toUpperCase().trim(),
          zip: dto.zip.trim(),
          country: (dto.country ?? "US").toUpperCase(),
          ...(dto.isDefaultShipping !== undefined ? { isDefaultShipping: dto.isDefaultShipping } : {}),
        },
      });
    });
    return serializeAddress(address);
  }

  /** Makes one address the default shipping address; every other one is cleared. */
  async setDefaultAddress(userId: string, addressId: string): Promise<SerializedAddress> {
    await this.assertOwnership(userId, addressId);
    const address = await this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({ where: { userId, NOT: { id: addressId } }, data: { isDefaultShipping: false } });
      return tx.address.update({ where: { id: addressId }, data: { isDefaultShipping: true } });
    });
    return serializeAddress(address);
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    await this.assertOwnership(userId, addressId);
    await this.prisma.address.delete({ where: { id: addressId } });
  }

  private async assertOwnership(userId: string, addressId: string): Promise<void> {
    if (!addressId) throw new BadRequestException("Address id is required.");
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== userId) {
      throw new NotFoundException("Address not found.");
    }
  }
}
