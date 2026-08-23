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

export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
