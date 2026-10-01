import { IsEmail, IsOptional, IsString, Length } from "class-validator";

export class RegisterDto {
  @IsEmail({}, { message: "Enter a valid email." })
  email!: string;

  @IsString()
  @Length(8, 128, { message: "Password must be at least 8 characters." })
  password!: string;

  @IsString()
  @Length(2, 120, { message: "Name is required." })
  fullName!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(1, 128)
  password!: string;
}

export class RefreshDto {
  @IsString()
  @Length(10, 256)
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @Length(10, 256)
  token!: string;

  @IsString()
  @Length(8, 128, { message: "Password must be at least 8 characters." })
  password!: string;
}

/** Staff invite acceptance: the invite token plus the account's first real password. */
export class AcceptInviteDto {
  @IsString()
  @Length(10, 256)
  token!: string;

  @IsString()
  @Length(12, 128, { message: "Password must be at least 12 characters." })
  password!: string;
}

/** Single-use action token from an emailed link (`/auth/confirm-email-change`, `/auth/verify-email`). */
export class ActionTokenDto {
  @IsString()
  @Length(10, 256)
  token!: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
