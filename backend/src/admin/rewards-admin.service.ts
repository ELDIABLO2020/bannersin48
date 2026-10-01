import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { RbacService } from "../rbac/rbac.service";
import type { AuthedUser } from "../common/jwt-auth.guard";
import type { AdjustRewardsDto, AdminRewardsQueryDto } from "./customers-admin.dto";

type Actor = Pick<AuthedUser, "id" | "permissions">;

/** Ledger row as `GET /admin/customers/:id/rewards` serves it: staff may see which staff member adjusted. */
export interface AdminRewardLedgerEntry {
  id: string;
  deltaCents: number;
  reason: string;
  orderId: string | null;
  orderNumber: string | null;
  createdBy: string | null;
  createdByEmail: string | null;
  createdAt: string;
}

export interface AdminRewardsPage {
  balanceCents: number;
  page: number;
  pageSize: number;
  total: number;
  ledger: AdminRewardLedgerEntry[];
}

export interface RewardAdjustmentResult {
  balanceCents: number;
  entry: AdminRewardLedgerEntry;
}

/**
 * Reward ledger for staff (`rewards:read`) and manual adjustments
 * (`rewards:adjust`, plan §5.2). An adjustment is one transaction: the
 * denormalised `user.rewardPointsBalance` moves with a `>= 0` guard, the
 * `ADJUSTMENT` ledger row records who did it, and the audit row carries the
 * reason — or none of it happens.
 */
@Injectable()
export class RewardsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rbac: RbacService,
  ) {}

  async ledger(customerId: string, query: AdminRewardsQueryDto): Promise<AdminRewardsPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const user = await this.loadCustomer(customerId);
    const [total, rows] = await Promise.all([
      this.prisma.rewardLedger.count({ where: { userId: user.id } }),
      this.prisma.rewardLedger.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { order: { select: { number: true } }, actor: { select: { email: true } } },
      }),
    ]);
    return { balanceCents: user.rewardPointsBalance, page, pageSize, total, ledger: rows.map(toEntry) };
  }

  /**
   * Credit (`deltaCents > 0`) or debit (`< 0`). A debit below the current
   * balance answers `409 INSUFFICIENT_BALANCE` and writes nothing: the balance
   * update is a compare-and-set (`rewardPointsBalance >= -deltaCents`), so two
   * concurrent debits cannot both pass the check.
   */
  async adjust(actor: Actor, customerId: string, dto: AdjustRewardsDto, ip?: string): Promise<RewardAdjustmentResult> {
    const user = await this.loadCustomer(customerId);
    const delta = dto.deltaCents;
    const reason = dto.reason.trim();

    const { row, balanceCents } = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({
        where: { id: user.id, rewardPointsBalance: { gte: Math.max(0, -delta) } },
        data: { rewardPointsBalance: { increment: delta } },
      });
      if (count === 0) {
        throw new ConflictException({
          code: "INSUFFICIENT_BALANCE",
          message: "The customer's reward balance is lower than the amount to deduct.",
        });
      }
      const after = await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { rewardPointsBalance: true } });
      const row = await tx.rewardLedger.create({
        data: { userId: user.id, deltaCents: delta, reason: "ADJUSTMENT", createdBy: actor.id },
        include: { order: { select: { number: true } }, actor: { select: { email: true } } },
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: "reward.adjust",
          entityType: "user",
          entityId: user.id,
          diff: {
            ledgerId: row.id,
            deltaCents: delta,
            reason,
            balanceCents: { from: after.rewardPointsBalance - delta, to: after.rewardPointsBalance },
          },
          ip,
        },
        tx,
      );
      return { row, balanceCents: after.rewardPointsBalance };
    });

    return { balanceCents, entry: toEntry(row) };
  }

  private async loadCustomer(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, rewardPointsBalance: true } });
    if (!user) throw new NotFoundException({ code: "NOT_FOUND", message: "Customer not found." });
    this.rbac.assertTargetKind(user, "customer");
    return user;
  }
}

function toEntry(r: {
  id: string;
  deltaCents: number;
  reason: string;
  orderId: string | null;
  createdBy: string | null;
  createdAt: Date;
  order: { number: string } | null;
  actor: { email: string } | null;
}): AdminRewardLedgerEntry {
  return {
    id: r.id,
    deltaCents: r.deltaCents,
    reason: r.reason,
    orderId: r.orderId,
    orderNumber: r.order?.number ?? null,
    createdBy: r.createdBy,
    createdByEmail: r.actor?.email ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}
