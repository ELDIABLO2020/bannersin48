import { Type } from "class-transformer";
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from "class-validator";

export class ChangePasswordDto {
  @IsString()
  @Length(1, 128)
  currentPassword!: string;

  @IsString()
  @Length(8, 128, { message: "Password must be at least 8 characters." })
  newPassword!: string;

  /** The caller's own refresh token, kept alive while every other session is revoked. */
  @IsOptional()
  @IsString()
  @Length(10, 256)
  keepRefreshToken?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

/** `PATCH /users/me/settings`: the two V1 notification toggles (plan §4.1). */
export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  notifyOrderUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyMarketing?: boolean;
}

/** `POST /users/me/email`: the password is checked before anything is revealed about `newEmail`. */
export class ChangeEmailDto {
  @IsEmail({}, { message: "Enter a valid email." })
  newEmail!: string;

  @IsString()
  @Length(1, 128)
  currentPassword!: string;
}

/** `GET /users/me/rewards?page=&pageSize=` */
export class RewardsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}

export class AddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @IsString()
  @Length(3, 200, { message: "Street address is required." })
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @IsString()
  @Length(2, 80, { message: "City is required." })
  city!: string;

  @IsString()
  @Length(2, 2, { message: "Use the two-letter state code." })
  state!: string;

  @IsString()
  @Length(5, 10, { message: "Enter a valid ZIP code." })
  zip!: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @IsOptional()
  @IsBoolean()
  isDefaultShipping?: boolean;
}
