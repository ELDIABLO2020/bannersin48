import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { UsersService } from "./users.service";
import { AddressDto, UpdateProfileDto } from "./users.dto";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  getProfile(@CurrentUser() user: AuthedUser) {
    return this.users.getProfile(user.id);
  }

  @Patch("me")
  updateProfile(@CurrentUser() user: AuthedUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

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

  @Delete("me/addresses/:id")
  deleteAddress(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.users.deleteAddress(user.id, id);
  }
}
