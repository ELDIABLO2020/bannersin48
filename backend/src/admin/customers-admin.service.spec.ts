import { ForbiddenException } from "@nestjs/common";
import { createHash } from "crypto";
import { AdminCustomersService } from "./customers-admin.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";
import type { EmailService } from "../notifications/email.service";

const accounts: Record<string, { id: string; email: string; role: string }> = {
  cust: { id: "cust", email: "cust@test.com", role: "CUSTOMER" },
  staff: { id: "staff", email: "staff@test.com", role: "STAFF" },
  staff2: { id: "staff2", email: "staff2@test.com", role: "STAFF" },
  editor: { id: "editor", email: "editor@test.com", role: "CONTENT_EDITOR" },
  admin: { id: "admin", email: "admin@test.com", role: "ADMIN" },
  admin2: { id: "admin2", email: "admin2@test.com", role: "ADMIN" },
};

function setup() {
  const resets: Array<{ tokenHash: string; requestedBy: string }> = [];
  const prisma = {
    user: { findUnique: jest.fn(async ({ where }: { where: { id: string } }) => accounts[where.id] ?? null) },
    passwordReset: { create: jest.fn(({ data }: { data: { tokenHash: string; requestedBy: string } }) => resets.push(data)) },
    refreshToken: { updateMany: jest.fn(() => ({ count: 1 })) },
    $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops)),
  };
  const email = { send: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new AdminCustomersService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    email as unknown as EmailService,
  );
  return { service, prisma, email, audit, resets };
}

const actor = (id: string) => ({ id, role: accounts[id]!.role });

describe("AdminCustomersService.adminResetPassword", () => {
  it.each([
    ["staff", "cust"],
    ["admin", "cust"],
    ["admin", "staff"],
    ["admin", "editor"],
    ["admin", "admin"], // own account
  ])("%s may reset %s", async (actorId, targetId) => {
    const { service, resets } = setup();
    await expect(service.adminResetPassword(actor(actorId), targetId, "203.0.113.9")).resolves.toEqual({ ok: true });
    expect(resets).toHaveLength(1);
  });

  it.each([
    ["staff", "staff2"],
    ["staff", "staff"],
    ["staff", "editor"],
    ["staff", "admin"],
    ["admin", "admin2"],
    ["editor", "cust"],
    ["cust", "cust"],
  ])("%s may not reset %s", async (actorId, targetId) => {
    const { service, prisma, email } = setup();
    await expect(service.adminResetPassword(actor(actorId), targetId)).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it("never returns the reset token; it only goes to the email transport", async () => {
    const { service, email, resets, audit } = setup();
    const result = await service.adminResetPassword(actor("staff"), "cust", "203.0.113.9");

    expect(result).toEqual({ ok: true });
    expect(JSON.stringify(result)).not.toMatch(/[a-f0-9]{64}/);
    const sent = email.send.mock.calls[0][0];
    expect(sent.to).toBe("cust@test.com");
    expect(createHash("sha256").update(sent.payload.resetToken).digest("hex")).toBe(resets[0]!.tokenHash);
    expect(resets[0]!.requestedBy).toBe("staff");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: "staff", entityId: "cust", ip: "203.0.113.9", action: "customer.admin_password_reset" }),
    );
  });
});
