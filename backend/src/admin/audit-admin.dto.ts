import { Type } from "class-transformer";
import { IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

/** Bounded filters for `GET /admin/audit` (backend-plan item 20: every query gets a DTO). */
export class AuditQueryDto {
  @IsOptional() @IsString() @MaxLength(64)
  actorId?: string;

  @IsOptional() @IsString() @MaxLength(80)
  action?: string;

  @IsOptional() @IsString() @MaxLength(40)
  entityType?: string;

  @IsOptional() @IsString() @MaxLength(64)
  entityId?: string;

  @IsOptional() @IsISO8601({ strict: true })
  from?: string;

  @IsOptional() @IsISO8601({ strict: true })
  to?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}
