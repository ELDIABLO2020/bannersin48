import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { RewardsAdminService } from "./rewards-admin.service";
import { RbacService } from "../rbac/rbac.service";
import { AuditService } from "../audit/audit.service";
import { ADMIN_WILDCARD, type EffectivePermissions, type PermissionKey } from "../rbac/permissions";
import type { PrismaService } from "../prisma/prisma.service";

/**
 * In-memory stand-in for `user`, `reward_ledger` and `audit_log`. The balance
 * update is a compare-and-set like Prisma's `updateMany` with a `gte` filter,
 * and transactions snapshot + roll back, so "409 writes nothing" and "one
 * audit row in the same transaction" are observable without Postgres.
 */
type Row = Record<string, any>;
interface State {
  users: Row[];
  ledger: Row[];
  audit: Row[];
}

let seq = 0;

class FakeDb {
  state: State;
  failOn: string | null = null;

  constructor(state: Partial<State>) {
    this.state = { users: [], ledger: [], audit: [], ...state };
  }

  client(): any {
    const s = () => this.state;
    const fail = (op: string) => {
      if (this.failOn === op) throw new Error(`injected failure: ${op}`);
    };
    return {
      user: {
        findUnique: async ({ where }: Row) => structuredClone(s().users.find((u) => u.id === where.id) ?? null),
        findUniqueOrThrow: async ({ where }: Row) => {
          const u = s().users.find((r) => r.id === where.id);
          if (!u) throw new Error("not found");
          return structuredClone(u);
        },
        updateMany: async ({ where, data }: Row) => {
          fail("user.updateMany");
          const rows = s().users.filter((u) => u.id === where.id && u.rewardPointsBalance >= where.rewardPointsBalance.gte);
          for (const u of rows) u.rewardPointsBalance += data.rewardPointsBalance.increment;
          return { count: rows.length };
        },
      },
      rewardLedger: {
        count: async ({ where }: Row) => s().ledger.filter((r) => r.userId === where.userId).length,
        findMany: async ({ where, skip = 0, take }: Row) =>
          s()
            .ledger.filter((r) => r.userId === where.userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(skip, take ? skip + take : undefined)
            .map((r) => ({ ...r, order: r.orderId ? { number: `BI48-${r.orderId}` } : null, actor: r.createdBy ? { email: `${r.createdBy}@test.com` } : null })),
        create: async ({ data }: Row) => {
          fail("rewardLedger.create");
          const row = { id: `rl_${++seq}`, orderId: null, createdAt: new Date("2026-10-01T12:00:00Z"), ...data };
          s().ledger.push(row);
          return { ...row, order: null, actor: { email: `${data.createdBy}@test.com` } };
        },
      },
      auditLog: {
        create: async ({ data }: Row) => {
          fail("auditLog.create");
          s().audit.push({ id: `al_${++seq}`, ...data });
        },
      },
      $transaction: async (fn: (tx: any) => Promise<unknown>) => {
        const snapshot = structuredClone(this.state);
        try {
          return await fn(this.client());
        } catch (err) {
          this.state = snapshot;
          throw err;
        }
      },
    };
  }
}

const grants: Record<string, EffectivePermissions> = {
  support: new Set<PermissionKey>(["rewards:read", "rewards:adjust"]),
  admin: ADMIN_WILDCARD,
};
const actor = (id: string) => ({ id, permissions: grants[id]! });

function setup(balance = 500) {
  const db = new FakeDb({
    users: [
      { id: "cust", role: "CUSTOMER", rewardPointsBalance: balance },
      { id: "staff", role: "STAFF", rewardPointsBalance: 0 },
    ],
    ledger: [{ id: "rl_seed", userId: "cust", deltaCents: balance, reason: "ORDER_EARN", orderId: "o1", createdBy: null, createdAt: new Date("2026-09-01T00:00:00Z") }],
  });
  const prisma = db.client() as PrismaService;
  const audit = new AuditService(prisma);
  const service = new RewardsAdminService(prisma, audit, new RbacService(prisma, audit));
  return { db, service };
}

describe("RewardsAdminService.adjust", () => {
  it("credits: ledger row (ADJUSTMENT, createdBy), balance increment and audit row commit together", async () => {
    const { db, service } = setup(500);
    const result = await service.adjust(actor("support"), "cust", { deltaCents: 250, reason: "Goodwill for the late delivery" }, "203.0.113.9");

    expect(result.balanceCents).toBe(750);
    expect(result.entry).toMatchObject({ deltaCents: 250, reason: "ADJUSTMENT", createdBy: "support", createdByEmail: "support@test.com" });
    expect(db.state.users[0].rewardPointsBalance).toBe(750);
    expect(db.state.ledger.at(-1)).toMatchObject({ userId: "cust", deltaCents: 250, reason: "ADJUSTMENT", createdBy: "support" });
    expect(db.state.audit).toEqual([
      expect.objectContaining({
        action: "reward.adjust",
        actorId: "support",
        entityType: "user",
        entityId: "cust",
        ip: "203.0.113.9",
        diff: expect.objectContaining({ deltaCents: 250, reason: "Goodwill for the late delivery", balanceCents: { from: 500, to: 750 } }),
      }),
    ]);
  });

  it("debits down to exactly zero", async () => {
    const { db, service } = setup(500);
    await expect(service.adjust(actor("admin"), "cust", { deltaCents: -500, reason: "Reversed a duplicate credit" })).resolves.toMatchObject({ balanceCents: 0 });
    expect(db.state.users[0].rewardPointsBalance).toBe(0);
  });

  it("refuses a debit below the balance with 409 INSUFFICIENT_BALANCE and writes nothing", async () => {
    const { db, service } = setup(100);
    await expect(service.adjust(actor("support"), "cust", { deltaCents: -101, reason: "Clawback after a chargeback" })).rejects.toMatchObject({
      response: { code: "INSUFFICIENT_BALANCE" },
    });
    await expect(service.adjust(actor("support"), "cust", { deltaCents: -101, reason: "Clawback after a chargeback" })).rejects.toThrow(ConflictException);
    expect(db.state.users[0].rewardPointsBalance).toBe(100);
    expect(db.state.ledger).toHaveLength(1);
    expect(db.state.audit).toEqual([]);
  });

  it("rolls the balance and ledger back when the audit row cannot be written", async () => {
    const { db, service } = setup(500);
    db.failOn = "auditLog.create";
    await expect(service.adjust(actor("admin"), "cust", { deltaCents: 100, reason: "Audit failure injected here" })).rejects.toThrow("injected failure");
    expect(db.state.users[0].rewardPointsBalance).toBe(500);
    expect(db.state.ledger).toHaveLength(1);
    expect(db.state.audit).toEqual([]);
  });

  it("only applies to customer accounts (403 FORBIDDEN_TARGET) and 404s unknown ids", async () => {
    const { db, service } = setup();
    await expect(service.adjust(actor("admin"), "staff", { deltaCents: 100, reason: "Staff are not customers" })).rejects.toThrow(ForbiddenException);
    await expect(service.adjust(actor("admin"), "nobody", { deltaCents: 100, reason: "Nobody is here at all" })).rejects.toThrow(NotFoundException);
    expect(db.state.ledger).toHaveLength(1);
  });
});

describe("RewardsAdminService.ledger", () => {
  it("pages the ledger newest first with the balance and the adjusting staff member's email", async () => {
    const { service } = setup(500);
    await service.adjust(actor("support"), "cust", { deltaCents: -200, reason: "Applied toward a reprint" });
    const page = await service.ledger("cust", { page: 1, pageSize: 10 });
    expect(page).toMatchObject({ balanceCents: 300, total: 2, page: 1, pageSize: 10 });
    expect(page.ledger.map((e) => e.deltaCents)).toEqual([-200, 500]);
    expect(page.ledger[0]).toMatchObject({ reason: "ADJUSTMENT", createdByEmail: "support@test.com", orderNumber: null });
    expect(page.ledger[1]).toMatchObject({ reason: "ORDER_EARN", createdByEmail: null, orderNumber: "BI48-o1" });
  });

  it("refuses staff targets", async () => {
    const { service } = setup();
    await expect(service.ledger("staff", {})).rejects.toThrow(ForbiddenException);
  });
});
