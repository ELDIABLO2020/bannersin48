import { BadRequestException, Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { singleFileUpload } from "../storage/upload-slots";
import type { UploadedTempFile } from "../storage/upload-storage";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientIp } from "../common/client-ip.decorator";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { RequireAnyPermission, RequirePermissions } from "../rbac/require-permissions.decorator";
import { assertCan, type PermissionKey } from "../rbac/permissions";
import { AdminOrdersService } from "./admin-orders.service";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class DropshipDto {
  @IsString() @MinLength(2) @MaxLength(60)
  externalRef!: string;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class StatusTransitionDto {
  @IsIn(["IN_PROCESSING", "ACCEPTED", "SHIPPED", "DELIVERED", "ON_HOLD", "CANCELLED"])
  status!: string;

  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class AddOrderNoteDto {
  @IsString() @MinLength(1) @MaxLength(1000)
  note!: string;
}

/** `GET /admin/dashboard` — the landing page's numbers (plan §5.2). Same read permission as the board. */
@Controller("admin/dashboard")
@RequirePermissions("orders:read")
export class AdminDashboardController {
  constructor(private readonly admin: AdminOrdersService) {}

  @Get()
  dashboard() {
    return this.admin.dashboard();
  }
}

/** Which permission a requested status needs (plan §3.5). */
export function permissionForStatus(status: string): PermissionKey {
  if (status === "ON_HOLD") return "orders:hold";
  if (status === "CANCELLED") return "orders:cancel";
  return "orders:update_status";
}

/**
 * Order buckets + fulfillment workspace APIs. Every mutation is audited and
 * writes an order_events row. Reads need `orders:read`; each mutation names its
 * own permission.
 */
@Controller("admin/orders")
@RequirePermissions("orders:read")
export class AdminOrdersController {
  constructor(private readonly admin: AdminOrdersService) {}

  @Get("buckets")
  buckets() {
    return this.admin.buckets();
  }

  @Get()
  list(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.admin.list({
      status: status || undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.admin.detail(id);
  }

  /** Internal note on the timeline; the customer is not emailed. */
  @Post(":id/note")
  @RequirePermissions("orders:note")
  async note(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: AddOrderNoteDto, @ClientIp() ip?: string) {
    await this.admin.addNote(id, user.id, dto.note, ip);
    return this.admin.detail(id);
  }

  @Post(":id/mark-paid")
  @RequirePermissions("payments:mark_paid")
  markPaid(@CurrentUser() user: AuthedUser, @Param("id") id: string, @ClientIp() ip?: string) {
    return this.admin.markPaid(id, user.id, ip);
  }

  @Post(":id/dropship")
  @RequirePermissions("orders:dropship")
  dropship(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: DropshipDto,
    @ClientIp() ip?: string,
  ) {
    return this.admin.recordDropship(id, user.id, dto, ip);
  }

  /** multipart/form-data: trackingNumber (field) + label (optional PDF file, streamed to disk). */
  @Post(":id/tracking")
  @RequirePermissions("orders:tracking")
  @UseInterceptors(...singleFileUpload("label", 20 * 1024 * 1024))
  async tracking(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() body: { trackingNumber?: string },
    @UploadedFile() label?: UploadedTempFile,
    @ClientIp() ip?: string,
  ) {
    if (!body?.trackingNumber || body.trackingNumber.trim().length < 6) {
      throw new BadRequestException({ code: "TRACKING_REQUIRED", message: "A tracking number is required." });
    }
    await this.admin.attachTracking(
      id,
      user.id,
      { trackingNumber: body.trackingNumber.trim() },
      label,
      ip,
    );
    return this.admin.detail(id);
  }

  /** The exact permission depends on the requested status: ON_HOLD → orders:hold, CANCELLED → orders:cancel, else orders:update_status. */
  @Post(":id/status")
  @RequireAnyPermission("orders:update_status", "orders:hold", "orders:cancel")
  transition(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: StatusTransitionDto,
    @ClientIp() ip?: string,
  ) {
    assertCan(user, [permissionForStatus(dto.status)]);
    return this.admin
      .transitionTo(id, dto.status as never, user.id, dto.reason, ip)
      .then(() => this.admin.detail(id));
  }
}
