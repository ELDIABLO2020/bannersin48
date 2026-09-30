import { Logger } from "@nestjs/common";
import { createHash } from "crypto";
import { EmailService, redactPayload } from "./email.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("EmailService", () => {
  it("never logs or stores a raw reset token", async () => {
    const token = "ab".repeat(32);
    const create = jest.fn();
    const log = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const service = new EmailService({ emailLog: { create } } as unknown as PrismaService);

    await service.send({ to: "a@test.com", template: "password_reset", payload: { resetToken: token, note: "hi" } });

    const fingerprint = createHash("sha256").update(token).digest("hex").slice(0, 8);
    const line = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(line).not.toContain(token);
    expect(line).toContain(`[redacted sha256:${fingerprint}]`);
    const stored = JSON.stringify(create.mock.calls[0][0].data.payload);
    expect(stored).not.toContain(token);
    expect(stored).toContain("hi");
    log.mockRestore();
  });

  it("redacts nested password/secret/token keys", () => {
    expect(redactPayload({ user: { password: "pw", name: "n" }, apiSecret: "", count: 2 })).toEqual({
      user: { password: expect.stringMatching(/^\[redacted sha256:[a-f0-9]{8}\]$/), name: "n" },
      apiSecret: "[redacted]",
      count: 2,
    });
  });
});
