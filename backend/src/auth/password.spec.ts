import * as bcrypt from "bcryptjs";
import { hashPassword, verifyPassword } from "./password";

jest.mock("bcryptjs", () => {
  const actual = jest.requireActual("bcryptjs");
  return { ...actual, compare: jest.fn(actual.compare) };
});

describe("password hashing", () => {
  it("verifies a real hash", async () => {
    const hash = await hashPassword("correct horse battery");
    await expect(verifyPassword("correct horse battery", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong", hash)).resolves.toBe(false);
  });

  it("still does a full bcrypt compare when there is no stored hash (M5 timing)", async () => {
    (bcrypt.compare as jest.Mock).mockClear();
    await expect(verifyPassword("anything", undefined)).resolves.toBe(false);
    expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    const [, hash] = (bcrypt.compare as jest.Mock).mock.calls[0];
    expect(bcrypt.getRounds(hash)).toBe(10);
  });
});
