import * as bcrypt from "bcryptjs";
import { CLI_ACTOR, parseArgs, resetPassword } from "./reset-password";

function prismaMock(user: Record<string, unknown> | null) {
  const prisma = {
    user: {
      findUnique: jest.fn(async () => user),
      update: jest.fn(async (args: unknown) => args),
    },
    refreshToken: { updateMany: jest.fn(async () => ({ count: 3 })) },
    passwordReset: { updateMany: jest.fn(async () => ({ count: 1 })) },
    auditLog: { create: jest.fn(async (args: unknown) => args) },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return prisma;
}

const user = { id: "u1", email: "owner@shop.com", role: "ADMIN", status: "ACTIVE" };

describe("reset-password CLI", () => {
  it("hashes the password, revokes sessions and reset links, and audits as system:cli", async () => {
    const prisma = prismaMock(user);
    const result = await resetPassword(prisma as never, "  Owner@Shop.com ", "a-long-new-passphrase");

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "owner@shop.com" } });
    const { data } = prisma.user.update.mock.calls[0]![0] as { data: { passwordHash: string } };
    expect(data.passwordHash).not.toContain("a-long-new-passphrase");
    await expect(bcrypt.compare("a-long-new-passphrase", data.passwordHash)).resolves.toBe(true);

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.passwordReset.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    const audit = (prisma.auditLog.create.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(audit).toMatchObject({ actorId: null, action: "user.cli_password_reset", entityId: "u1" });
    expect(audit.diff).toMatchObject({ actor: CLI_ACTOR });
    expect(JSON.stringify(audit)).not.toContain("a-long-new-passphrase");
    expect(result).toEqual({ userId: "u1", role: "ADMIN", status: "ACTIVE", revokedSessions: 3 });
  });

  it("rejects short passwords before touching the database", async () => {
    const prisma = prismaMock(user);
    await expect(resetPassword(prisma as never, user.email, "elevenchars")).rejects.toThrow(/at least 12/);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("fails for an unknown email", async () => {
    await expect(resetPassword(prismaMock(null) as never, "nobody@shop.com", "a-long-new-passphrase")).rejects.toThrow(
      /No account/,
    );
  });

  it("refuses a password on the command line", () => {
    expect(() => parseArgs(["--email", "a@b.com", "--password", "hunter2hunter2"])).toThrow(/ps/);
    expect(() => parseArgs(["--email=a@b.com", "--password=hunter2hunter2"])).toThrow(/ps/);
    expect(parseArgs(["--email", "a@b.com", "--password-stdin"])).toEqual({ email: "a@b.com", passwordStdin: true });
  });

  it("takes the email as the first positional argument", () => {
    expect(parseArgs(["owner@shop.com"])).toEqual({ email: "owner@shop.com", passwordStdin: false });
    expect(() => parseArgs(["a@b.com", "c@d.com"])).toThrow(/exactly one/);
    expect(() => parseArgs(["a@b.com", "--force"])).toThrow(/Unknown option/);
  });
});
