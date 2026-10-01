import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientIp } from "../common/client-ip.decorator";
import { AllowPasswordChangeRequired } from "../common/password-change.decorator";
import { RateLimit } from "../common/throttling";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { UsersService } from "./users.service";
import { AddressDto, ChangeEmailDto, ChangePasswordDto, RewardsQueryDto, UpdateProfileDto, UpdateSettingsDto } from "./users.dto";

/**
 * The signed-in customer's own account (plan §4.2). Every route is scoped to
 * `user.id` from the verified token; ids in the URL are checked for ownership
 * and answer 404, never 403, for someone else's row.
 */
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  getProfile(@CurrentUser() user: AuthedUser) {
    return this.users.getProfile(user.id);
  }

  /** The one mutation a temporary-password account may perform. */
  @Post("me/password")
  @AllowPasswordChangeRequired()
  @RateLimit("auth")
  changePassword(@CurrentUser() user: AuthedUser, @Body() dto: ChangePasswordDto, @ClientIp() ip?: string) {
    return this.users.changePassword(user.id, dto, ip);
  }

  @Patch("me")
  updateProfile(@CurrentUser() user: AuthedUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Patch("me/settings")
  updateSettings(@CurrentUser() user: AuthedUser, @Body() dto: UpdateSettingsDto) {
    return this.users.updateSettings(user.id, dto);
  }

  // --- Email ----------------------------------------------------------------

  @Post("me/email")
  @RateLimit("auth")
  requestEmailChange(@CurrentUser() user: AuthedUser, @Body() dto: ChangeEmailDto, @ClientIp() ip?: string) {
    return this.users.requestEmailChange(user.id, dto, ip);
  }

  @Post("me/email/resend-verification")
  @RateLimit("auth")
  resendVerification(@CurrentUser() user: AuthedUser) {
    return this.users.resendVerification(user.id);
  }

  // --- Sessions -------------------------------------------------------------

  @Get("me/sessions")
  listSessions(@CurrentUser() user: AuthedUser) {
    return this.users.listSessions(user.id, user.sessionId);
  }

  /** Signs out every device except this one. */
  @Delete("me/sessions")
  revokeOtherSessions(@CurrentUser() user: AuthedUser, @ClientIp() ip?: string) {
    return this.users.revokeOtherSessions(user.id, user.sessionId, ip);
  }

  @Delete("me/sessions/:id")
  revokeSession(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.users.revokeSession(user.id, id);
  }

  // --- Rewards --------------------------------------------------------------

  @Get("me/rewards")
  getRewards(@CurrentUser() user: AuthedUser, @Query() query: RewardsQueryDto) {
    return this.users.getRewards(user.id, query);
  }

  // --- Address book ---------------------------------------------------------

  @Get("me/addresses")
  listAddresses(@CurrentUser() user: AuthedUser) {
    return this.users.listAddresses(user.id);
  }

  @Post("me/addresses")
  createAddress(@CurrentUser() user: AuthedUser, @Body() dto: AddressDto) {
    return this.users.createAddress(user.id, dto);
  }

  @Patch("me/addresses/:id")
  updateAddress(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: AddressDto) {
    return this.users.updateAddress(user.id, id, dto);
  }

  @Post("me/addresses/:id/default")
  @HttpCode(200)
  setDefaultAddress(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.users.setDefaultAddress(user.id, id);
  }

  @Delete("me/addresses/:id")
  @HttpCode(204)
  deleteAddress(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.users.deleteAddress(user.id, id);
  }
}
