import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Length, Max, MaxLength, Min, NotEquals } from "class-validator";

/** `PATCH /admin/customers/:id` — name / phone on the customer's behalf (`customers:update`). */
export class UpdateCustomerDto {
  @IsOptional() @IsString() @Length(1, 60)
  firstName?: string;

  @IsOptional() @IsString() @Length(1, 60)
  lastName?: string;

  @IsOptional() @IsString() @MaxLength(20)
  phone?: string | null;
}

export class SuspendCustomerDto {
  @IsString() @Length(3, 200, { message: "Give a reason (3–200 characters)." })
  reason!: string;
}

export class ReactivateCustomerDto {
  @IsOptional() @IsString() @MaxLength(200)
  reason?: string;
}

/** `GET /admin/customers/:id/rewards?page=&pageSize=` */
export class AdminRewardsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}

/** Hard cap per adjustment (plan §5.2): $500 either way. */
export const REWARD_ADJUSTMENT_MAX_CENTS = 50_000;

/**
 * `POST /admin/customers/:id/rewards/adjust` (`rewards:adjust`). Money is
 * integer cents like the ledger; a reason is mandatory and travels into the
 * audit row.
 */
export class AdjustRewardsDto {
  @IsInt({ message: "Amount must be whole cents." })
  @NotEquals(0, { message: "Amount cannot be zero." })
  @Min(-REWARD_ADJUSTMENT_MAX_CENTS, { message: "Adjustments are capped at $500." })
  @Max(REWARD_ADJUSTMENT_MAX_CENTS, { message: "Adjustments are capped at $500." })
  deltaCents!: number;

  @IsString() @Length(10, 200, { message: "Give a reason (10–200 characters)." })
  reason!: string;
}
