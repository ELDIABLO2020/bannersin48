import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientIp } from "../common/client-ip.decorator";
import { RateLimit } from "../common/throttling";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { RequirePermissions } from "../rbac/require-permissions.decorator";
import { StaffAdminService } from "./staff-admin.service";
import { AssignRoleDto, CreateStaffDto, ListStaffQueryDto, ReactivateStaffDto, SuspendStaffDto, UpdateStaffDto } from "./staff-admin.dto";

/**
 * Staff accounts (`/admin/users*`, plan §5.2). Customers live under
 * `/admin/customers`; this surface only ever lists or touches non-customer
 * accounts.
 */
@Controller("admin/users")
export class StaffAdminController {
  constructor(private readonly staff: StaffAdminService) {}

  @RequirePermissions("users:read")
  @Get()
  list(@Query() query: ListStaffQueryDto) {
    return this.staff.list(query);
  }

  @RequirePermissions("users:read")
  @Get(":id")
  detail(@Param("id") id: string) {
    return this.staff.detail(id);
  }

  @RequirePermissions("users:create")
  @RateLimit("sensitive")
  @Post()
  create(@CurrentUser() user: AuthedUser, @Body() dto: CreateStaffDto, @ClientIp() ip?: string) {
    return this.staff.create(user, dto, ip);
  }

  @RequirePermissions("users:create")
  @RateLimit("sensitive")
  @Post(":id/invite/resend")
  resendInvite(@CurrentUser() user: AuthedUser, @Param("id") id: string, @ClientIp() ip?: string) {
    return this.staff.resendInvite(user, id, ip);
  }

  @RequirePermissions("users:update")
  @Patch(":id")
  update(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: UpdateStaffDto, @ClientIp() ip?: string) {
    return this.staff.update(user, id, dto, ip);
  }

  /** The `admin` role additionally needs `rbac:manage` (checked in RbacService.assignRole). */
  @RequirePermissions("users:update")
  @Post(":id/role")
  assignRole(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: AssignRoleDto, @ClientIp() ip?: string) {
    return this.staff.assignRole(user, id, dto.roleId, ip);
  }

  @RequirePermissions("users:suspend")
  @Post(":id/suspend")
  suspend(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: SuspendStaffDto, @ClientIp() ip?: string) {
    return this.staff.suspend(user, id, dto.reason, ip);
  }

  @RequirePermissions("users:suspend")
  @Post(":id/reactivate")
  reactivate(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: ReactivateStaffDto, @ClientIp() ip?: string) {
    return this.staff.reactivate(user, id, dto.reason, ip);
  }

  @RequirePermissions("users:reset_password")
  @RateLimit("sensitive")
  @Post(":id/reset-password")
  resetPassword(@CurrentUser() user: AuthedUser, @Param("id") id: string, @ClientIp() ip?: string) {
    return this.staff.resetPassword(user, id, ip);
  }
}
