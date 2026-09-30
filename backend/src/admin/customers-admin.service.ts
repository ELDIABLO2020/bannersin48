import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../notifications/email.service";
import { serializeAddress, serializeUser } from "../common/user.serializer";
import type { AuthedUser } from "../common/jwt-auth.guard";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Customer management (STAFF + ADMIN): search, profile + orders, password reset. */
@Injectable()
export class AdminCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
  ) {}

  async search(search?: string, page = 1, pageSize = 25) {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
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

  /** Profile + full order history. */
  async detail(idOrEmail: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ id: idOrEmail }, { email: idOrEmail.toLowerCase() }] },
      include: { addresses: true },
    });
    if (!user) throw new NotFoundException({ code: "NOT_FOUND", message: "Customer not found." });

    const orders = await this.prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: { take: 1 } },
    });

    return {
      user: serializeUser(user, []),
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

  /**
   * Admin-initiated password reset: creates a password_resets row with
   * requestedBy set to the actor, revokes sessions and emails the account owner.
   * The token only ever goes to the email transport; it is never returned.
   *
   * STAFF may reset CUSTOMER accounts only. ADMIN may also reset STAFF and
   * CONTENT_EDITOR accounts. Another ADMIN's password can't be reset here
   * (use the admin:reset-password CLI on the server).
   */
  async adminResetPassword(actor: Pick<AuthedUser, "id" | "role">, customerId: string, ip?: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: customerId } });
    if (!user) throw new NotFoundException({ code: "NOT_FOUND", message: "Customer not found." });
    assertMayReset(actor, user);

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

export function assertMayReset(actor: Pick<AuthedUser, "id" | "role">, target: { id: string; role: string }): void {
  if (target.role === "CUSTOMER" && (actor.role === "STAFF" || actor.role === "ADMIN")) return;
  if (actor.role === "ADMIN" && (target.role === "STAFF" || target.role === "CONTENT_EDITOR")) return;
  if (actor.role === "ADMIN" && target.role === "ADMIN" && target.id === actor.id) return;
  throw new ForbiddenException({
    code: "FORBIDDEN_TARGET",
    message:
      target.role === "ADMIN"
        ? "Admin passwords can't be reset from the dashboard. Use the server reset-password script."
        : "Only an admin can reset the password of a staff account.",
  });
}
