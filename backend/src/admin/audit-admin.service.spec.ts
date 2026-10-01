import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { AUDIT_DEFAULT_PAGE_SIZE, AUDIT_MAX_PAGE_SIZE, AuditAdminService, auditWhere } from "./audit-admin.service";
import { AuditQueryDto } from "./audit-admin.dto";
import type { PrismaService } from "../prisma/prisma.service";

const rows = [
  { id: "al_1", actorId: "admin", action: "rbac.user.role.assign", entityType: "user", entityId: "picker", diff: { from: {}, to: {} }, ip: "203.0.113.1", createdAt: new Date("2026-10-02T10:00:00Z"), actor: { email: "a@test.com" } },
  { id: "al_2", actorId: null, action: "user.cli_password_reset", entityType: "user", entityId: "lead", diff: { actor: "system:cli" }, ip: null, createdAt: new Date("2026-10-01T10:00:00Z"), actor: null },
];

function setup() {
  const prisma = {
    auditLog: {
      count: jest.fn(async () => rows.length),
      findMany: jest.fn(async (args: { distinct?: string[] }) => (args.distinct ? [{ action: "rbac.user.role.assign" }, { action: "user.cli_password_reset" }] : rows)),
    },
  };
  return { prisma, service: new AuditAdminService(prisma as unknown as PrismaService) };
}

const query = (input: Record<string, unknown>) => plainToInstance(AuditQueryDto, input);

describe("AuditQueryDto", () => {
  it("accepts bounded filters and coerces page numbers from query strings", () => {
    const dto = query({ actorId: "admin", action: "order.mark_paid", from: "2026-10-01T00:00:00Z", page: "2", pageSize: "25" });
    expect(validateSync(dto)).toEqual([]);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(25);
  });

  it.each([
    ["an over-long action", { action: "x".repeat(81) }],
    ["a non-ISO date", { from: "yesterday" }],
    ["page 0", { page: "0" }],
    ["a page size above the cap", { pageSize: String(AUDIT_MAX_PAGE_SIZE + 1) }],
    ["a non-numeric page", { page: "two" }],
  ])("rejects %s", (_label, input) => {
    expect(validateSync(query(input)).length).toBeGreaterThan(0);
  });
});

describe("auditWhere", () => {
  it("maps every filter to the Prisma where clause and bounds the date range", () => {
    expect(auditWhere(query({}))).toEqual({});
    expect(auditWhere(query({ actorId: "admin", action: "a.b", entityType: "user", entityId: "u1" }))).toEqual({ actorId: "admin", action: "a.b", entityType: "user", entityId: "u1" });
    expect(auditWhere(query({ from: "2026-10-01T00:00:00Z", to: "2026-10-02T00:00:00Z" }))).toEqual({
      createdAt: { gte: new Date("2026-10-01T00:00:00Z"), lte: new Date("2026-10-02T00:00:00Z") },
    });
    expect(auditWhere(query({ to: "2026-10-02T00:00:00Z" }))).toEqual({ createdAt: { lte: new Date("2026-10-02T00:00:00Z") } });
    expect(() => auditWhere(query({ from: "2026-10-03T00:00:00Z", to: "2026-10-02T00:00:00Z" }))).toThrow(BadRequestException);
  });
});

describe("AuditAdminService", () => {
  it("lists newest first with the actor email joined and the diff as stored", async () => {
    const { service, prisma } = setup();
    const result = await service.list(query({ entityType: "user", page: "3", pageSize: "10" }));
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { entityType: "user" }, orderBy: { createdAt: "desc" }, skip: 20, take: 10, include: { actor: { select: { email: true } } } }),
    );
    expect(result).toMatchObject({ page: 3, pageSize: 10, total: 2 });
    expect(result.items[0]).toEqual({
      id: "al_1",
      actorId: "admin",
      actorEmail: "a@test.com",
      action: "rbac.user.role.assign",
      entityType: "user",
      entityId: "picker",
      diff: { from: {}, to: {} },
      ip: "203.0.113.1",
      createdAt: "2026-10-02T10:00:00.000Z",
    });
    expect(result.items[1]).toMatchObject({ actorId: null, actorEmail: null, diff: { actor: "system:cli" } });
  });

  it("applies the default and maximum page size", async () => {
    const { service, prisma } = setup();
    await service.list(query({}));
    expect(prisma.auditLog.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 0, take: AUDIT_DEFAULT_PAGE_SIZE }));
    await service.list({ pageSize: 10_000 });
    expect(prisma.auditLog.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: AUDIT_MAX_PAGE_SIZE }));
  });

  it("returns distinct action names for the filter", async () => {
    const { service, prisma } = setup();
    await expect(service.actions()).resolves.toEqual(["rbac.user.role.assign", "user.cli_password_reset"]);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } });
  });
});
