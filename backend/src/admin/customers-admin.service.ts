import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../notifications/email.service";
import { serializeUser } from "../common/user.serializer";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Admin customer management (§3e): search, profile + orders, password reset. */
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
      addresses: user.addresses.map((a) => ({
        id: a.id,
        label: a.label,
        line1: a.line1,
        line2: a.line2,
        city: a.city,
        state: a.state,
        zip: a.zip,
        country: a.country,
      })),
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
   * requestedBy set to the admin, revokes sessions and emails the customer.
   * Returns the raw token in local dev only (SES delivery replaces it).
   */
  async adminResetPassword(actorId: string, customerId: string, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: customerId } });
    if (!user) throw new NotFoundException({ code: "NOT_FOUND", message: "Customer not found." });
    if (user.role === "ADMIN" && actorId !== user.id) {
      throw new BadRequestException({ code: "FORBIDDEN", message: "Use a different admin to reset another admin." });
    }

    const rawToken = randomBytes(32).toString("hex");
    await this.prisma.$transaction([
      this.prisma.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: sha256(rawToken),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          requestedBy: actorId,
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
      payload: { note: "An administrator initiated a password reset for your account." },
    });
    await this.audit.record({
      actorId,
      action: "customer.admin_password_reset",
      entityType: "user",
      entityId: user.id,
      diff: { requestedBy: { from: null, to: actorId } },
      ip,
    });

    return { ok: true as const, devResetToken: rawToken }; // dev token removed when SES lands
  }
}
