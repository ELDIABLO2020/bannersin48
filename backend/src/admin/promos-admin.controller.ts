import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientIp } from "../common/client-ip.decorator";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { RequirePermissions } from "../rbac/require-permissions.decorator";
import { PromosAdminService } from "./promos-admin.service";
import { CreatePromoDto, ListPromosQueryDto, UpdatePromoDto } from "./promos-admin.dto";

/**
 * Promo codes (`/admin/promos*`, plan §5.2). Management only: checkout does not
 * apply codes yet (§11 Q7).
 */
@Controller("admin/promos")
export class PromosAdminController {
  constructor(private readonly promos: PromosAdminService) {}

  @RequirePermissions("promos:read")
  @Get()
  list(@Query() query: ListPromosQueryDto) {
    return this.promos.list(query);
  }

  @RequirePermissions("promos:read")
  @Get(":id")
  get(@Param("id") id: string) {
    return this.promos.get(id);
  }

  @RequirePermissions("promos:write")
  @Post()
  create(@CurrentUser() user: AuthedUser, @Body() dto: CreatePromoDto, @ClientIp() ip?: string) {
    return this.promos.create(user.id, dto, ip);
  }

  @RequirePermissions("promos:write")
  @Patch(":id")
  update(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: UpdatePromoDto, @ClientIp() ip?: string) {
    return this.promos.update(user.id, id, dto, ip);
  }

  /** Deactivates (`active: false`); the row stays for the orders that reference it. */
  @RequirePermissions("promos:write")
  @Delete(":id")
  deactivate(@CurrentUser() user: AuthedUser, @Param("id") id: string, @ClientIp() ip?: string) {
    return this.promos.deactivate(user.id, id, ip);
  }
}
