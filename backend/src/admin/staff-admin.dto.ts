import { Type } from "class-transformer";
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from "class-validator";

export class ListStaffQueryDto {
  @IsOptional() @IsString() @MaxLength(120)
  search?: string;

  @IsOptional() @IsIn(["ACTIVE", "SUSPENDED", "INVITED"])
  status?: "ACTIVE" | "SUSPENDED" | "INVITED";

  @IsOptional() @IsString() @MaxLength(64)
  roleId?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}

/**
 * `temporary_password`: the admin sets a first password and tells the employee
 * out of band; the account must change it on first sign-in. `invite`: the
 * account is created INVITED and a 72-hour link goes through EmailService
 * (which only logs until a transport exists — plan §11 decision 4).
 */
export class CreateStaffDto {
  @IsEmail({}, { message: "Enter a valid email." })
  email!: string;

  @IsString() @Length(1, 60)
  firstName!: string;

  @IsString() @Length(1, 60)
  lastName!: string;

  @IsOptional() @IsString() @MaxLength(20)
  phone?: string;

  @IsString() @Length(1, 64)
  roleId!: string;

  @IsIn(["temporary_password", "invite"])
  mode!: "temporary_password" | "invite";

  /** Required for `temporary_password`; must satisfy the operator password rules (12–128 chars, no leading/trailing spaces). */
  @IsOptional() @IsString() @Length(1, 128)
  temporaryPassword?: string;
}

export class UpdateStaffDto {
  @IsOptional() @IsString() @Length(1, 60)
  firstName?: string;

  @IsOptional() @IsString() @Length(1, 60)
  lastName?: string;

  @IsOptional() @IsString() @MaxLength(20)
  phone?: string | null;
}

export class AssignRoleDto {
  @IsString() @Length(1, 64)
  roleId!: string;
}

export class SuspendStaffDto {
  @IsString() @Length(3, 200, { message: "Give a reason (3–200 characters)." })
  reason!: string;
}

export class ReactivateStaffDto {
  @IsOptional() @IsString() @MaxLength(200)
  reason?: string;
}
