import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import { RateLimit } from "../common/throttling";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { DesignsService } from "./designs.service";
import { CreateDesignDto, UpdateDesignDto } from "./designs.dto";

/** The signed-in customer's saved designs (plan §4.2). Owner-scoped; no permission required. */
@Controller("designs")
export class DesignsController {
  constructor(private readonly designs: DesignsService) {}

  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.designs.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthedUser, @Body() dto: CreateDesignDto) {
    return this.designs.create(user.id, dto);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.designs.get(user.id, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: UpdateDesignDto) {
    return this.designs.update(user.id, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.designs.remove(user.id, id);
  }

  /** Fresh quote at current prices for "Order this design". Shares the quote rate bucket. */
  @Post(":id/quote")
  @RateLimit("quote")
  quote(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.designs.quote(user.id, id);
  }
}
