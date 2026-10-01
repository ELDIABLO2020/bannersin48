import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export const PROMO_CODE_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;

export class ListPromosQueryDto {
  @IsOptional() @IsString() @MaxLength(40)
  search?: string;

  /** `true` / `false`; omitted lists everything. */
  @IsOptional() @IsIn(["true", "false"])
  active?: "true" | "false";

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}

/**
 * `POST /admin/promos`. `value` is a percentage (PERCENT, ≤ 100) or dollars
 * (FIXED); both are stored as `Decimal(10,2)` and never as floats — the DTO
 * caps the input at two decimals and the service writes `toFixed(2)` strings.
 */
export class CreatePromoDto {
  @IsString() @Matches(PROMO_CODE_PATTERN, { message: "Codes are 3–40 letters, digits, dashes or underscores." })
  code!: string;

  @IsIn(["PERCENT", "FIXED"])
  type!: "PERCENT" | "FIXED";

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100000)
  value!: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000)
  minOrder?: number;

  @IsOptional() @IsInt() @Min(1) @Max(1000000)
  maxUses?: number | null;

  @IsOptional() @IsInt() @Min(1) @Max(1000)
  perUserLimit?: number | null;

  @IsOptional() @IsISO8601({ strict: true })
  startsAt?: string | null;

  @IsOptional() @IsISO8601({ strict: true })
  endsAt?: string | null;

  @IsOptional() @IsBoolean()
  active?: boolean;
}

/** `PATCH /admin/promos/:id` — every field optional; `null` clears a nullable one. */
export class UpdatePromoDto {
  @IsOptional() @IsString() @Matches(PROMO_CODE_PATTERN, { message: "Codes are 3–40 letters, digits, dashes or underscores." })
  code?: string;

  @IsOptional() @IsIn(["PERCENT", "FIXED"])
  type?: "PERCENT" | "FIXED";

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100000)
  value?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000)
  minOrder?: number;

  @IsOptional() @IsInt() @Min(1) @Max(1000000)
  maxUses?: number | null;

  @IsOptional() @IsInt() @Min(1) @Max(1000)
  perUserLimit?: number | null;

  @IsOptional() @IsISO8601({ strict: true })
  startsAt?: string | null;

  @IsOptional() @IsISO8601({ strict: true })
  endsAt?: string | null;

  @IsOptional() @IsBoolean()
  active?: boolean;
}
