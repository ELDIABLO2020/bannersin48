import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientIp } from "../common/client-ip.decorator";
import { RateLimit } from "../common/throttling";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { RequireAnyPermission, RequirePermissions } from "../rbac/require-permissions.decorator";
import { AdminCustomersService } from "./customers-admin.service";
import { RewardsAdminService } from "./rewards-admin.service";
import { AdjustRewardsDto, AdminRewardsQueryDto, ReactivateCustomerDto, SuspendCustomerDto, UpdateCustomerDto } from "./customers-admin.dto";

/**
 * Customer accounts (`/admin/customers*`, plan §5.2): CUSTOMER-kind users only;
 * staff live under `/admin/users`. Mutations audited.
 */
@Controller("admin/customers")
export class AdminCustomersController {
  constructor(
    private readonly customers: AdminCustomersService,
    private readonly rewards: RewardsAdminService,
  ) {}

  @RequirePermissions("customers:read")
  @Get()
  search(@Query("search") search?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.customers.search(search || undefined, page ? Number(page) : 1, pageSize ? Number(pageSize) : 25);
  }

  @RequirePermissions("customers:read")
  @Get(":id")
  detail(@Param("id") id: string) {
    return this.customers.detail(id);
  }

  @RequirePermissions("customers:update")
  @Patch(":id")
  update(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: UpdateCustomerDto, @ClientIp() ip?: string) {
    return this.customers.update(user, id, dto, ip);
  }

  @RequirePermissions("customers:suspend")
  @Post(":id/suspend")
  suspend(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: SuspendCustomerDto, @ClientIp() ip?: string) {
    return this.customers.suspend(user, id, dto.reason, ip);
  }

  @RequirePermissions("customers:suspend")
  @Post(":id/reactivate")
  reactivate(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: ReactivateCustomerDto, @ClientIp() ip?: string) {
    return this.customers.reactivate(user, id, dto.reason, ip);
  }

  /** Customers need `customers:reset_password`, staff targets `users:reset_password`; the service checks the target's kind. */
  @RequireAnyPermission("customers:reset_password", "users:reset_password")
  @RateLimit("sensitive")
  @Post(":id/reset-password")
  resetPassword(@CurrentUser() user: AuthedUser, @Param("id") id: string, @ClientIp() ip?: string) {
    return this.customers.adminResetPassword(user, id, ip);
  }

  // --- Rewards ---

  @RequirePermissions("rewards:read")
  @Get(":id/rewards")
  rewardsLedger(@Param("id") id: string, @Query() query: AdminRewardsQueryDto) {
    return this.rewards.ledger(id, query);
  }

  @RequirePermissions("rewards:adjust")
  @RateLimit("sensitive")
  @Post(":id/rewards/adjust")
  adjustRewards(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: AdjustRewardsDto, @ClientIp() ip?: string) {
    return this.rewards.adjust(user, id, dto, ip);
  }
}
