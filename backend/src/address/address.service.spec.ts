import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AddressService } from "./address.service";

const input = {
  fullName: "  Ada   Lovelace ",
  street1: " 123   Main St ",
  city: " Ann Arbor ",
  region: "mi",
  postalCode: "48104",
  country: "US" as const,
};

function configWith(env: Record<string, string>): ConfigService {
  return {
    getOrThrow: (key: string) => {
      if (!(key in env)) throw new Error(`missing ${key}`);
      return env[key];
    },
  } as unknown as ConfigService;
}

describe("AddressService", () => {
  const service = new AddressService(configWith({ ADDRESS_TOKEN_SECRET: "a".repeat(32) + "b".repeat(32) }));

  it("normalizes US syntax but reports the result as unverified", () => {
    const result = service.validate(input);
    expect(result.valid).toBe(false);
    expect(result.verificationStatus).toBe("unverified");
    expect(result.requiresAcknowledgement).toBe(true);
    expect(result.normalized).toMatchObject({
      fullName: "Ada Lovelace",
      street1: "123 Main St",
      city: "Ann Arbor",
      region: "MI",
      country: "US",
    });
  });

  it("binds the validation token to the normalized address", () => {
    const result = service.validate(input);
    expect(service.assertToken(input, result.validationToken)).toEqual(result.normalized);
    expect(() =>
      service.assertToken({ ...input, street1: "999 Other St" }, result.validationToken),
    ).toThrow(BadRequestException);
  });

  it("signs with ADDRESS_TOKEN_SECRET, never JWT_SECRET", () => {
    const jwtOnly = new AddressService(configWith({ JWT_SECRET: "a".repeat(32) + "b".repeat(32) }));
    expect(() => jwtOnly.validate(input)).toThrow(/ADDRESS_TOKEN_SECRET/);

    const other = new AddressService(configWith({ ADDRESS_TOKEN_SECRET: "c".repeat(64) }));
    const token = service.validate(input).validationToken;
    expect(() => other.assertToken(input, token)).toThrow(BadRequestException);
  });
});
