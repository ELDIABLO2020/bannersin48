import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { OptionalJwtAuthGuard } from "../common/optional-jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientIp } from "../common/client-ip.decorator";
import { Public } from "../common/public.decorator";
import { RateLimit } from "../common/throttling";
import type { AuthedUser } from "../common/jwt-auth.guard";
import {
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
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  @Public()
  @RateLimit("auth")
  login(@Body() dto: LoginDto, @ClientIp() ip: string | undefined) {
    return this.auth.login(dto, ip);
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
  async logout(@CurrentUser() user: AuthedUser, @Body() dto: LogoutDto): Promise<void> {
    await this.auth.logout(user.id, dto.refreshToken);
  }

  @Post("refresh")
  @Public()
  @RateLimit("auth")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
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
}
