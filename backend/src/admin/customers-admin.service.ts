import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../notifications/email.service";
import { serializeAddress, serializeUser, type SerializedAddress, type SerializedUser } from "../common/user.serializer";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { RbacService, rbacUserInclude } from "../rbac/rbac.service";
import type { UpdateCustomerDto } from "./customers-admin.dto";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

type Actor = Pick<AuthedUser, "id" | "permissions">;

/** `GET /admin/customers/:id` */
export interface AdminCustomerDetail {
  user: SerializedUser;
  /** Account state staff act on (plan §5.2); `rewardBalanceCents` mirrors `user.rewardsPoints`. */
  account: {
    status: string;
    suspendedAt: string | null;
    suspendedReason: string | null;
    emailVerifiedAt: string | null;
    lastLoginAt: string | null;
    rewardBalanceCents: number;
    orderCount: number;
  };
  addresses: SerializedAddress[];
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalLabel: string;
    createdAt: string;
    placedAt: string | null;
  }>;
}

/**
 * Customer management (`customers:*`, plan §5.2): search, profile + orders,
 * edit on the customer's behalf, suspend / reactivate, password reset. Every
 * mutation audits inside its transaction; suspension revokes sessions so the
 * next request answers 401 (the guard re-reads status).
 */
@Injectable()
export class AdminCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly rbac: RbacService,
  ) {}

  /** CUSTOMER-kind accounts only; staff are listed under `/admin/users` (plan §5.2). */
  async search(search?: string, page = 1, pageSize = 25) {
    const where = {
      role: "CUSTOMER" as const,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: Math.min(100, Math.max(1, pageSize)),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          rewardPointsBalance: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      items: rows.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || null,
        phone: u.phone,
        role: u.role,
        status: u.status,
        rewardsPoints: u.rewardPointsBalance,
        orderCount: u._count.orders,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  }

  /** Profile, account state and full order history. CUSTOMER-kind accounts only (staff: `/admin/users/:id`). */
  async detail(idOrEmail: string): Promise<AdminCustomerDetail> {
    const user = await this.prisma.user.findFirst({
      where: { role: "CUSTOMER", OR: [{ id: idOrEmail }, { email: idOrEmail.toLowerCase() }] },
      include: { addresses: true, ...rbacUserInclude() },
    });
    if (!user) throw new NotFoundException({ code: "NOT_FOUND", message: "Customer not found." });

    const [orders, orderCount] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { items: { take: 1 } },
      }),
      this.prisma.order.count({ where: { userId: user.id } }),
    ]);

    return {
      user: serializeUser(user, []),
      account: {
        status: user.status,
        suspendedAt: user.suspendedAt?.toISOString() ?? null,
        suspendedReason: user.suspendedReason,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        rewardBalanceCents: user.rewardPointsBalance,
        orderCount,
      },
      addresses: user.addresses.map(serializeAddress),
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.number,
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalLabel: `$${Number(o.total).toFixed(2)}`,
        createdAt: o.createdAt.toISOString(),
        placedAt: o.placedAt?.toISOString() ?? null,
      })),
    };
  }

  // --- Profile / status (plan §5.2) ----------------------------------------------

  /** Name / phone on the customer's behalf; audit `customer.update` with the field diff. */
  async update(actor: Actor, id: string, dto: UpdateCustomerDto, ip?: string): Promise<AdminCustomerDetail> {
    const user = await this.loadCustomerTarget(id);
    const data = {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
    };
    const before = { firstName: user.firstName, lastName: user.lastName, phone: user.phone };
    const diff = AuditService.diffOf(before, { ...before, ...data });
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      await this.audit.record({ actorId: actor.id, action: "customer.update", entityType: "user", entityId: id, diff, ip }, tx);
    });
    return this.detail(id);
  }

  /** Suspends a storefront account and signs it out everywhere; audit `customer.suspend`. */
  async suspend(actor: Actor, id: string, reason: string, ip?: string): Promise<AdminCustomerDetail> {
    this.rbac.assertNotSelf(actor, id);
    const user = await this.loadCustomerTarget(id);
    if (user.status === "SUSPENDED") throw new ConflictException({ code: "ALREADY_SUSPENDED", message: "This account is already suspended." });
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { status: "SUSPENDED", suspendedAt: now, suspendedReason: reason.trim() } });
      await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: now } });
      await this.audit.record(
        { actorId: actor.id, action: "customer.suspend", entityType: "user", entityId: id, diff: { status: { from: user.status, to: "SUSPENDED" }, reason: reason.trim() }, ip },
        tx,
      );
    });
    return this.detail(id);
  }

  async reactivate(actor: Actor, id: string, reason: string | undefined, ip?: string): Promise<AdminCustomerDetail> {
    this.rbac.assertNotSelf(actor, id);
    const user = await this.loadCustomerTarget(id);
    if (user.status !== "SUSPENDED") throw new ConflictException({ code: "NOT_SUSPENDED", message: "This account is not suspended." });
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { status: "ACTIVE", suspendedAt: null, suspendedReason: null } });
      await this.audit.record(
        {
          actorId: actor.id,
          action: "customer.reactivate",
          entityType: "user",
          entityId: id,
          diff: { status: { from: "SUSPENDED", to: "ACTIVE" }, previousReason: user.suspendedReason, reason: reason?.trim() || null },
          ip,
        },
        tx,
      );
    });
    return this.detail(id);
  }

  /** Target-kind rule 5: `customers:*` actions apply to CUSTOMER accounts only. */
  private async loadCustomerTarget(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ code: "NOT_FOUND", message: "Customer not found." });
    this.rbac.assertTargetKind(user, "customer");
    return user;
  }

  /**
   * Admin-initiated password reset: creates a password_resets row with
   * requestedBy set to the actor, revokes sessions and emails the account owner.
   * The token only ever goes to the email transport; it is never returned.
   *
   * Customer targets need `customers:reset_password`; staff targets need
   * `users:reset_password`. Another admin's password can't be reset here
   * (use the admin:reset-password CLI on the server) — see RbacService.assertMayResetPassword.
   */
  async adminResetPassword(actor: Pick<AuthedUser, "id" | "permissions">, customerId: string, ip?: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: customerId }, include: { accessRole: { select: { key: true } } } });
    if (!user) throw new NotFoundException({ code: "NOT_FOUND", message: "Customer not found." });
    this.rbac.assertMayResetPassword(actor, user);

    const rawToken = randomBytes(32).toString("hex");
    await this.prisma.$transaction([
      this.prisma.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: sha256(rawToken),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          requestedBy: actor.id,
        },
      }),
      // Force re-login everywhere.
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.email.send({
      to: user.email,
      template: "admin_password_reset",
      payload: { note: "An administrator initiated a password reset for your account.", resetToken: rawToken },
    });
    await this.audit.record({
      actorId: actor.id,
      action: "customer.admin_password_reset",
      entityType: "user",
      entityId: user.id,
      diff: { requestedBy: { from: null, to: actor.id }, targetRole: user.role },
      ip,
    });

    return { ok: true };
  }
}
