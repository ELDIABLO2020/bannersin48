import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Address, AddressValidationResult } from "@bannersin48/shared";
import type { ValidateAddressDto } from "./address.dto";

export const ADDRESS_VALIDATION_VERSION = "us-syntax-v1-2026-08";

function clean(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value.trim().replace(/\s+/g, " ");
}

@Injectable()
export class AddressService {
  constructor(private readonly config: ConfigService) {}

  normalize(input: ValidateAddressDto): Address {
    return {
      fullName: clean(input.fullName)!,
      company: clean(input.company) ?? "",
      street1: clean(input.street1)!,
      street2: clean(input.street2) ?? "",
      city: clean(input.city)!,
      region: input.region.trim().toUpperCase(),
      postalCode: input.postalCode.trim(),
      country: "US",
      phone: clean(input.phone) ?? "",
      email: input.email?.trim().toLowerCase() ?? "",
    };
  }

  validate(input: ValidateAddressDto): AddressValidationResult {
    const normalized = this.normalize(input);
    const validationToken = this.sign(normalized);
    return {
      valid: false,
      verificationStatus: "unverified",
      normalized,
      suggested: normalized,
      validationToken,
      validationVersion: ADDRESS_VALIDATION_VERSION,
      requiresAcknowledgement: true,
      message:
        "Address syntax was normalized, but no external address provider is connected. Confirm the unverified-address risk before submitting.",
    };
  }

  assertToken(input: ValidateAddressDto, token: string): Address {
    const normalized = this.normalize(input);
    const expected = this.sign(normalized);
    const suppliedBytes = Buffer.from(token);
    const expectedBytes = Buffer.from(expected);
    if (
      suppliedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(suppliedBytes, expectedBytes)
    ) {
      throw new BadRequestException({
        code: "ADDRESS_VALIDATION_REQUIRED",
        message: "Validate the current shipping address again before submitting.",
      });
    }
    return normalized;
  }

  private sign(address: Address): string {
    const secret = this.config.get<string>("JWT_SECRET");
    if (!secret) throw new Error("JWT_SECRET is required for address validation tokens.");
    const payload = Buffer.from(
      JSON.stringify({ version: ADDRESS_VALIDATION_VERSION, address }),
    ).toString("base64url");
    const signature = createHmac("sha256", secret).update(payload).digest("base64url");
    return `${payload}.${signature}`;
  }
}
