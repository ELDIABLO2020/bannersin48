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

describe("AddressService", () => {
  const service = new AddressService(
    { get: () => "test-address-signing-secret" } as unknown as ConfigService,
  );

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
});
