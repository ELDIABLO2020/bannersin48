import { Body, Controller, Get, Headers, HttpCode, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { OptionalJwtAuthGuard } from "../common/optional-jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientIp } from "../common/client-ip.decorator";
import { Public } from "../common/public.decorator";
import { AllowPasswordChangeRequired } from "../common/password-change.decorator";
import { RateLimit } from "../common/throttling";
import type { AuthedUser } from "../common/jwt-auth.guard";
import {
  AcceptInviteDto,
  ActionTokenDto,
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from "./auth.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @Public()
  @RateLimit("auth")
  register(@Body() dto: RegisterDto, @ClientIp() ip: string | undefined, @Headers("user-agent") userAgent?: string) {
    return this.auth.register(dto, { ip, userAgent });
  }

  @Post("login")
  @Public()
  @RateLimit("auth")
  login(@Body() dto: LoginDto, @ClientIp() ip: string | undefined, @Headers("user-agent") userAgent?: string) {
    return this.auth.login(dto, ip, userAgent);
  }

  /**
   * Matches the MSW contract: returns the user JSON, or the literal `null`
   * body with HTTP 200 when unauthenticated (Nest maps a null return value
   * to an empty body, so we send it explicitly).
   */
  @Get("me")
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  async me(@CurrentUser() user: AuthedUser | undefined, @Res() res: Response) {
    if (!user) return res.status(200).json(null);
    return res.json(await this.auth.me(user.id));
  }

  @Post("logout")
  @HttpCode(204)
  @AllowPasswordChangeRequired()
  async logout(@CurrentUser() user: AuthedUser, @Body() dto: LogoutDto): Promise<void> {
    await this.auth.logout(user.id, dto.refreshToken);
  }

  /**
   * Public: a staff invite link carries a single-use token. Setting the
   * password activates the account and signs the user in.
   */
  @Post("accept-invite")
  @Public()
  @RateLimit("auth")
  acceptInvite(@Body() dto: AcceptInviteDto, @ClientIp() ip: string | undefined, @Headers("user-agent") userAgent?: string) {
    return this.auth.acceptInvite(dto.token, dto.password, ip, userAgent);
  }

  @Post("refresh")
  @Public()
  @RateLimit("auth")
  refresh(@Body() dto: RefreshDto, @ClientIp() ip: string | undefined, @Headers("user-agent") userAgent?: string) {
    return this.auth.refresh(dto.refreshToken, { ip, userAgent });
  }

  @Post("forgot-password")
  @Public()
  @RateLimit("auth")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post("reset-password")
  @Public()
  @RateLimit("auth")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  /**
   * Public: the link emailed to the *new* address by `POST /users/me/email`.
   * Swaps the email, marks it verified and signs every session out.
   */
  @Post("confirm-email-change")
  @Public()
  @RateLimit("auth")
  confirmEmailChange(@Body() dto: ActionTokenDto, @ClientIp() ip: string | undefined) {
    return this.auth.confirmEmailChange(dto.token, ip);
  }

  /** Public: the link emailed by `POST /users/me/email/resend-verification`. */
  @Post("verify-email")
  @Public()
  @RateLimit("auth")
  verifyEmail(@Body() dto: ActionTokenDto, @ClientIp() ip: string | undefined) {
    return this.auth.verifyEmail(dto.token, ip);
  }
}
