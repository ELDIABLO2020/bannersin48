import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PromosAdminService } from "./promos-admin.service";
import { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";

type Row = Record<string, any>;

let seq = 0;

/** In-memory `promo_code` + `audit_log` with the unique-code constraint and transactional rollback. */
class FakeDb {
  promos: Row[] = [];
  audit: Row[] = [];
  failOn: string | null = null;

  client(): any {
    const fail = (op: string) => {
      if (this.failOn === op) throw new Error(`injected failure: ${op}`);
    };
    const unique = (code: string, exceptId?: string) => {
      if (this.promos.some((p) => p.code === code && p.id !== exceptId)) {
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`code`)", { code: "P2002", clientVersion: "5" });
      }
    };
    return {
      promoCode: {
        findUnique: async ({ where }: Row) => structuredClone(this.promos.find((p) => p.id === where.id) ?? null),
        count: async ({ where }: Row) => this.filter(where).length,
        findMany: async ({ where, skip = 0, take }: Row) => this.filter(where).slice(skip, take ? skip + take : undefined),
        create: async ({ data }: Row) => {
          fail("promoCode.create");
          unique(data.code);
          const now = new Date("2026-10-01T12:00:00Z");
          const row = { id: `promo_${++seq}`, timesUsed: 0, createdAt: now, updatedAt: now, ...data };
          this.promos.push(row);
          return structuredClone(row);
        },
        update: async ({ where, data }: Row) => {
          const row = this.promos.find((p) => p.id === where.id)!;
          if (data.code !== undefined) unique(data.code, row.id);
          Object.assign(row, data, { updatedAt: new Date("2026-10-02T12:00:00Z") });
          return structuredClone(row);
        },
      },
      auditLog: {
        create: async ({ data }: Row) => {
          fail("auditLog.create");
          this.audit.push({ id: `al_${++seq}`, ...data });
        },
      },
      $transaction: async (fn: (tx: any) => Promise<unknown>) => {
        const snapshot = { promos: structuredClone(this.promos), audit: structuredClone(this.audit) };
        try {
          return await fn(this.client());
        } catch (err) {
          this.promos = snapshot.promos;
          this.audit = snapshot.audit;
          throw err;
        }
      },
    };
  }

  private filter(where: Row = {}): Row[] {
    return this.promos
      .filter((p) => (where.active === undefined || p.active === where.active) && (!where.code || p.code.includes(where.code.contains)))
      .sort((a, b) => Number(b.active) - Number(a.active) || b.createdAt.getTime() - a.createdAt.getTime())
      .map((p) => structuredClone(p));
  }
}

function setup() {
  const db = new FakeDb();
  const prisma = db.client() as PrismaService;
  const service = new PromosAdminService(prisma, new AuditService(prisma));
  return { db, service };
}

describe("PromosAdminService", () => {
  it("creates a code: upper-cased, decimal strings for money, audited in the same transaction", async () => {
    const { db, service } = setup();
    const promo = await service.create("admin", { code: "spring-10", type: "PERCENT", value: 10, minOrder: 50.5, maxUses: 100, startsAt: "2026-10-01T00:00:00.000Z" }, "203.0.113.1");

    expect(promo).toMatchObject({ code: "SPRING-10", type: "PERCENT", value: "10.00", minOrder: "50.50", maxUses: 100, perUserLimit: null, timesUsed: 0, active: true, endsAt: null });
    expect(promo.startsAt).toBe("2026-10-01T00:00:00.000Z");
    expect(db.audit).toEqual([expect.objectContaining({ action: "promo_code.create", actorId: "admin", entityType: "promo_code", entityId: promo.id, ip: "203.0.113.1" })]);
  });

  it("refuses a duplicate code with 409 PROMO_CODE_TAKEN (case-insensitively) and writes nothing", async () => {
    const { db, service } = setup();
    await service.create("admin", { code: "WELCOME", type: "FIXED", value: 5 });
    await expect(service.create("admin", { code: "welcome", type: "FIXED", value: 7 })).rejects.toMatchObject({ response: { code: "PROMO_CODE_TAKEN" } });
    await expect(service.create("admin", { code: "welcome", type: "FIXED", value: 7 })).rejects.toThrow(ConflictException);
    expect(db.promos).toHaveLength(1);
    expect(db.audit).toHaveLength(1);
  });

  it("validates the rules: percentages ≤ 100, end after start", async () => {
    const { db, service } = setup();
    await expect(service.create("admin", { code: "TOOBIG", type: "PERCENT", value: 101 })).rejects.toMatchObject({ response: { code: "PROMO_VALUE_INVALID" } });
    await expect(
      service.create("admin", { code: "BACKWARDS", type: "FIXED", value: 5, startsAt: "2026-10-05T00:00:00.000Z", endsAt: "2026-10-01T00:00:00.000Z" }),
    ).rejects.toMatchObject({ response: { code: "PROMO_WINDOW_INVALID" } });
    await expect(service.create("admin", { code: "BACKWARDS", type: "FIXED", value: 5, startsAt: "2026-10-05T00:00:00.000Z", endsAt: "2026-10-01T00:00:00.000Z" })).rejects.toThrow(
      BadRequestException,
    );
    expect(db.promos).toEqual([]);
  });

  it("updates with a field diff in the audit row and re-checks the window against stored values", async () => {
    const { db, service } = setup();
    const promo = await service.create("admin", { code: "SUMMER", type: "FIXED", value: 20, startsAt: "2026-06-01T00:00:00.000Z" });
    const updated = await service.update("admin", promo.id, { value: 25, perUserLimit: 2 });
    expect(updated).toMatchObject({ value: "25.00", perUserLimit: 2, startsAt: "2026-06-01T00:00:00.000Z" });
    expect(db.audit.at(-1)).toMatchObject({ action: "promo_code.update", entityId: promo.id, diff: { value: { from: "20.00", to: "25.00" }, perUserLimit: { from: null, to: 2 } } });
    // endsAt before the stored startsAt is still refused.
    await expect(service.update("admin", promo.id, { endsAt: "2026-05-01T00:00:00.000Z" })).rejects.toMatchObject({ response: { code: "PROMO_WINDOW_INVALID" } });
    // Switching to PERCENT with a stored value over 100 is refused too.
    await service.update("admin", promo.id, { value: 150 });
    await expect(service.update("admin", promo.id, { type: "PERCENT" })).rejects.toMatchObject({ response: { code: "PROMO_VALUE_INVALID" } });
  });

  it("deactivates instead of deleting, once; reactivation goes through update", async () => {
    const { db, service } = setup();
    const promo = await service.create("admin", { code: "GONE", type: "FIXED", value: 1 });
    await expect(service.deactivate("admin", promo.id)).resolves.toMatchObject({ active: false });
    await expect(service.deactivate("admin", promo.id)).resolves.toMatchObject({ active: false });
    expect(db.promos).toHaveLength(1);
    expect(db.audit.filter((a) => a.action === "promo_code.deactivate")).toHaveLength(1);
    await expect(service.update("admin", promo.id, { active: true })).resolves.toMatchObject({ active: true });
    await expect(service.deactivate("admin", "missing")).rejects.toThrow(NotFoundException);
  });

  it("rolls the row back when the audit write fails", async () => {
    const { db, service } = setup();
    db.failOn = "auditLog.create";
    await expect(service.create("admin", { code: "ROLLBACK", type: "FIXED", value: 1 })).rejects.toThrow("injected failure");
    expect(db.promos).toEqual([]);
  });

  it("lists active first, filters by status and code fragment, and pages", async () => {
    const { service } = setup();
    await service.create("admin", { code: "ALPHA", type: "FIXED", value: 1 });
    await service.create("admin", { code: "BETA", type: "FIXED", value: 1, active: false });
    await service.create("admin", { code: "ALPHABET", type: "FIXED", value: 1 });
    const all = await service.list({});
    expect(all.total).toBe(3);
    expect(all.items.map((p) => p.active)).toEqual([true, true, false]);
    expect((await service.list({ active: "false" })).items.map((p) => p.code)).toEqual(["BETA"]);
    expect((await service.list({ search: "alpha" })).items.map((p) => p.code).sort()).toEqual(["ALPHA", "ALPHABET"]);
    expect((await service.list({ page: 2, pageSize: 2 })).items).toHaveLength(1);
  });
});
