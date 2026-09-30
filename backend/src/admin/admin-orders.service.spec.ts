import { mkdtempSync, writeFileSync, readdirSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { AdminOrdersService } from "./admin-orders.service";
import { OrdersService } from "../orders/orders.service";
import { AuditService } from "../audit/audit.service";
import { StorageService } from "../storage/storage.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { EmailService } from "../notifications/email.service";
import type { ArtworkService } from "../artwork/artwork.service";
import type { DeliveryService } from "../delivery/delivery.service";
import type { UploadedTempFile } from "../storage/upload-storage";

/**
 * In-memory stand-in for the tables mark-paid and the fulfillment steps touch.
 * Transactions run one at a time (like row locks on the same order) and roll
 * back every table on error, so atomicity and compare-and-set behaviour are
 * observable without a database.
 */
type Row = Record<string, any>;
interface State {
  orders: Row[];
  users: Row[];
  ledger: Row[];
  events: Row[];
  audit: Row[];
  shipments: Row[];
  dropships: Row[];
  artwork: Row[];
}

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([k, v]) => row[k] === v);
}

let seq = 0;
const id = (p: string) => `${p}_${++seq}`;

class FakeDb {
  state: State;
  failOn: string | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(state: Partial<State>) {
    this.state = { orders: [], users: [], ledger: [], events: [], audit: [], shipments: [], dropships: [], artwork: [], ...state };
  }

  private maybeFail(op: string) {
    if (this.failOn === op) throw new Error(`injected failure: ${op}`);
  }

  client(): any {
    const s = () => this.state;
    return {
      order: {
        findUnique: async ({ where }: any) => structuredClone(s().orders.find((o) => o.id === where.id) ?? null),
        findUniqueOrThrow: async ({ where }: any) => {
          const o = s().orders.find((r) => r.id === where.id);
          if (!o) throw new Error("not found");
          return structuredClone(o);
        },
        updateMany: async ({ where, data }: any) => {
          this.maybeFail("order.updateMany");
          const rows = s().orders.filter((o) => matches(o, where));
          for (const r of rows) Object.assign(r, data);
          return { count: rows.length };
        },
      },
      user: {
        findUnique: async ({ where }: any) => structuredClone(s().users.find((u) => u.id === where.id) ?? null),
        update: async ({ where, data }: any) => {
          this.maybeFail("user.update");
          const u = s().users.find((r) => r.id === where.id)!;
          u.rewardPointsBalance += data.rewardPointsBalance.increment;
          return u;
        },
      },
      rewardLedger: {
        create: async ({ data }: any) => {
          this.maybeFail("rewardLedger.create");
          s().ledger.push({ id: id("rl"), ...data });
        },
      },
      orderEvent: { create: async ({ data }: any) => s().events.push({ id: id("ev"), ...data }) },
      auditLog: {
        create: async ({ data }: any) => {
          this.maybeFail("auditLog.create");
          s().audit.push({ id: id("al"), ...data });
        },
      },
      shipment: {
        findUnique: async ({ where }: any) => structuredClone(s().shipments.find((r) => r.orderId === where.orderId) ?? null),
        upsert: async ({ where, update, create }: any) => {
          this.maybeFail("shipment.upsert");
          const existing = s().shipments.find((r) => r.orderId === where.orderId);
          if (existing) return Object.assign(existing, update);
          const row = { id: id("sh"), trackingNumber: null, labelFileId: null, ...create };
          s().shipments.push(row);
          return row;
        },
      },
      dropshipSubmission: {
        findUnique: async ({ where }: any) => structuredClone(s().dropships.find((r) => r.orderId === where.orderId) ?? null),
        create: async ({ data }: any) => {
          if (s().dropships.some((r) => r.orderId === data.orderId)) {
            throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "5" });
          }
          s().dropships.push({ id: id("ds"), ...data });
        },
      },
      artworkFile: {
        create: async ({ data }: any) => {
          const row = { id: id("art"), ...data };
          s().artwork.push(row);
          return row;
        },
      },
      $transaction: (fn: (tx: any) => Promise<unknown>) => this.transaction(fn),
    };
  }

  transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const run = async () => {
      const snapshot = structuredClone(this.state);
      try {
        return await fn(this.client());
      } catch (err) {
        this.state = snapshot;
        throw err;
      }
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }
}

function setup(order: Partial<Row> = {}) {
  const db = new FakeDb({
    orders: [
      {
        id: "ord_1",
        number: "BI48-000001",
        userId: "cust_1",
        status: "RECEIVED",
        paymentStatus: "PENDING_PAYMENT",
        rewardPointsEarned: 0,
        total: "276.00",
        paymentConfirmedAt: null,
        ...order,
      },
    ],
    users: [{ id: "cust_1", email: "c@example.com", rewardPointsBalance: 0 }],
  });
  const prisma = db.client() as PrismaService;
  const delivery = {
    estimate: () => ({ guaranteedDeliveryDate: "2026-10-05", guaranteedDeliveryDow: "Monday" }),
  } as unknown as DeliveryService;
  const orders = new OrdersService(prisma, {} as never, delivery, {} as never, {} as never, {} as never, {} as never);
  const email = { send: jest.fn(async () => undefined) } as unknown as EmailService;
  const storageDir = mkdtempSync(join(tmpdir(), "bi48-admin-spec-"));
  const storage = new StorageService(new ConfigService({ LOCAL_STORAGE_DIR: storageDir }));
  const service = new AdminOrdersService(prisma, orders, storage, email, new AuditService(prisma), {} as ArtworkService);
  return { db, service, email, storage, storageDir };
}

describe("AdminOrdersService.markPaid (H8)", () => {
  it("credits rewards, moves to IN_PROCESSING and audits, all in one transaction", async () => {
    const { db, service } = setup();
    await service.markPaid("ord_1", "staff_1", "203.0.113.5");

    const order = db.state.orders[0];
    expect(order).toMatchObject({
      status: "IN_PROCESSING",
      paymentStatus: "MARKED_PAID",
      rewardPointsEarned: 276,
      committedDeliveryDate: "2026-10-05",
    });
    expect(order.paymentConfirmedAt).toBeInstanceOf(Date);
    expect(db.state.ledger).toEqual([expect.objectContaining({ userId: "cust_1", deltaCents: 276, reason: "ORDER_EARN", orderId: "ord_1" })]);
    expect(db.state.users[0].rewardPointsBalance).toBe(276);
    expect(db.state.events).toEqual([expect.objectContaining({ fromStatus: "RECEIVED", toStatus: "IN_PROCESSING", actorId: "staff_1" })]);
    expect(db.state.audit).toEqual([
      expect.objectContaining({
        action: "order.mark_paid",
        actorId: "staff_1",
        entityId: "ord_1",
        ip: "203.0.113.5",
        diff: expect.objectContaining({ paymentStatus: { from: "PENDING_PAYMENT", to: "MARKED_PAID" } }),
      }),
    ]);
  });

  it.each(["CANCELLED", "SHIPPED", "DELIVERED", "ACCEPTED"])(
    "credits nothing and writes nothing for a %s order with payment still pending",
    async (status) => {
      const { db, service } = setup({ status });
      await expect(service.markPaid("ord_1", "staff_1")).rejects.toMatchObject({
        status: 400,
        response: { code: "INVALID_STATUS_TRANSITION" },
      });
      expect(db.state.ledger).toEqual([]);
      expect(db.state.users[0].rewardPointsBalance).toBe(0);
      expect(db.state.events).toEqual([]);
      expect(db.state.audit).toEqual([]);
      expect(db.state.orders[0]).toMatchObject({ status, paymentStatus: "PENDING_PAYMENT", rewardPointsEarned: 0 });
    },
  );

  it("answers 409 on a second mark-paid and credits once", async () => {
    const { db, service } = setup();
    await service.markPaid("ord_1", "staff_1");
    await expect(service.markPaid("ord_1", "staff_2")).rejects.toMatchObject({ status: 409, response: { code: "ALREADY_PAID" } });
    expect(db.state.ledger).toHaveLength(1);
    expect(db.state.users[0].rewardPointsBalance).toBe(276);
    expect(db.state.audit).toHaveLength(1);
  });

  it("credits once when two staff click mark-paid at the same time (conditional update)", async () => {
    const { db, service, email } = setup();
    // Both requests read the order while it is still PENDING_PAYMENT.
    const results = await Promise.allSettled([service.markPaid("ord_1", "staff_1"), service.markPaid("ord_1", "staff_2")]);

    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409, response: { code: "CONFLICT" } });
    expect(db.state.ledger).toHaveLength(1);
    expect(db.state.users[0].rewardPointsBalance).toBe(276);
    expect(db.state.events).toHaveLength(1);
    expect(db.state.audit).toHaveLength(1);
    expect(email.send).toHaveBeenCalledTimes(1);
  });

  it.each(["rewardLedger.create", "user.update", "auditLog.create"])(
    "rolls everything back when %s fails",
    async (op) => {
      const { db, service } = setup();
      db.failOn = op;
      await expect(service.markPaid("ord_1", "staff_1")).rejects.toThrow(/injected failure/);
      expect(db.state.orders[0]).toMatchObject({ status: "RECEIVED", paymentStatus: "PENDING_PAYMENT", rewardPointsEarned: 0 });
      expect(db.state.ledger).toEqual([]);
      expect(db.state.users[0].rewardPointsBalance).toBe(0);
      expect(db.state.events).toEqual([]);
      expect(db.state.audit).toEqual([]);
    },
  );

  it("does not write a zero-cent ledger row for orders under $1", async () => {
    const { db, service } = setup({ total: "0.99" });
    await service.markPaid("ord_1", "staff_1");
    expect(db.state.ledger).toEqual([]);
    expect(db.state.audit).toHaveLength(1);
  });
});

describe("AdminOrdersService.transitionTo (L5)", () => {
  it("does not touch the shipment when the transition is invalid", async () => {
    const { db, service } = setup({ status: "IN_PROCESSING", paymentStatus: "MARKED_PAID" });
    await expect(service.transitionTo("ord_1", "SHIPPED", "staff_1")).rejects.toMatchObject({ status: 400 });
    expect(db.state.shipments).toEqual([]);
    expect(db.state.audit).toEqual([]);
  });

  it("writes shippedAt, the event and the audit row together", async () => {
    const { db, service } = setup({ status: "ACCEPTED", paymentStatus: "MARKED_PAID" });
    await service.transitionTo("ord_1", "SHIPPED", "staff_1");
    expect(db.state.orders[0].status).toBe("SHIPPED");
    expect(db.state.shipments[0].shippedAt).toBeInstanceOf(Date);
    expect(db.state.audit).toEqual([expect.objectContaining({ action: "order.shipped", diff: { status: { from: "ACCEPTED", to: "SHIPPED" } } })]);
  });

  it("rolls back the shipment timestamp if the audit write fails", async () => {
    const { db, service } = setup({ status: "SHIPPED", paymentStatus: "MARKED_PAID" });
    db.failOn = "auditLog.create";
    await expect(service.transitionTo("ord_1", "DELIVERED", "staff_1")).rejects.toThrow(/injected failure/);
    expect(db.state.orders[0].status).toBe("SHIPPED");
    expect(db.state.shipments).toEqual([]);
    expect(db.state.events).toEqual([]);
  });
});

describe("AdminOrdersService.recordDropship (L6)", () => {
  it("answers 409 DROPSHIP_EXISTS when a concurrent submission wins (P2002)", async () => {
    const { db, service } = setup({ status: "IN_PROCESSING", paymentStatus: "MARKED_PAID" });
    const results = await Promise.allSettled([
      service.recordDropship("ord_1", "staff_1", { externalRef: "DS-1" }),
      service.recordDropship("ord_1", "staff_2", { externalRef: "DS-2" }),
    ]);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409, response: { code: "DROPSHIP_EXISTS" } });
    expect(db.state.dropships).toHaveLength(1);
    expect(db.state.audit).toHaveLength(1);
    expect(db.state.events).toHaveLength(1);
  });

  it("answers 409 for a sequential duplicate too", async () => {
    const { service } = setup({ status: "IN_PROCESSING", paymentStatus: "MARKED_PAID" });
    await service.recordDropship("ord_1", "staff_1", { externalRef: "DS-1" });
    await expect(service.recordDropship("ord_1", "staff_1", { externalRef: "DS-2" })).rejects.toMatchObject({
      status: 409,
      response: { code: "DROPSHIP_EXISTS" },
    });
  });
});

describe("AdminOrdersService.attachTracking (streamed label)", () => {
  function tempLabel(storage: StorageService, content: string, detectedMime: UploadedTempFile["detectedMime"] = "application/pdf"): UploadedTempFile {
    mkdirSync(storage.incomingDir, { recursive: true });
    const path = join(storage.incomingDir, `${Math.random().toString(36).slice(2)}.part`);
    writeFileSync(path, content);
    return {
      originalname: "label.pdf",
      path,
      size: Buffer.byteLength(content),
      sha256: createHash("sha256").update(content).digest("hex"),
      detectedMime,
      head: Buffer.from(content),
    };
  }

  it("stores the label under the order, links it to the shipment and accepts the order", async () => {
    const { db, service, storage, storageDir } = setup({ status: "IN_PROCESSING", paymentStatus: "MARKED_PAID" });
    await storage.onModuleInit();
    const label = tempLabel(storage, "%PDF-1.7 label");

    await service.attachTracking("ord_1", "staff_1", { trackingNumber: "794612345678" }, label);

    expect(existsSync(label.path)).toBe(false);
    expect(readdirSync(storage.incomingDir)).toEqual([]);
    const art = db.state.artwork[0];
    expect(art.s3Key).toBe(`labels/ord_1/${label.sha256}.pdf`);
    expect(readFileSync(join(storageDir, art.s3Key), "utf8")).toBe("%PDF-1.7 label");
    expect(db.state.shipments[0]).toMatchObject({ trackingNumber: "794612345678", labelFileId: art.id });
    expect(db.state.orders[0].status).toBe("ACCEPTED");
    expect(db.state.audit).toEqual([expect.objectContaining({ action: "order.tracking_attach" })]);
  });

  it("rejects a non-PDF label and removes the temp file", async () => {
    const { db, service, storage } = setup({ status: "IN_PROCESSING", paymentStatus: "MARKED_PAID" });
    await storage.onModuleInit();
    const label = tempLabel(storage, "\x89PNG\r\n\x1a\n....", "image/png");
    await expect(service.attachTracking("ord_1", "staff_1", { trackingNumber: "794612345678" }, label)).rejects.toMatchObject({
      response: { code: "LABEL_NOT_PDF" },
    });
    expect(readdirSync(storage.incomingDir)).toEqual([]);
    expect(db.state.shipments).toEqual([]);
  });
});
