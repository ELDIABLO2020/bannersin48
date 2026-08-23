import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthedUser } from "../common/jwt-auth.guard";
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

/**
 * Admin/staff operations APIs (§3a/§3b). Every mutation is audited and
 * writes an order_events row. STAFF = fulfillment; ADMIN = everything.
 */
@Controller("admin/orders")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("STAFF", "ADMIN")
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

  @Post(":id/mark-paid")
  markPaid(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Req() req: Request) {
    return this.admin.markPaid(id, user.id, ipOf(req));
  }

  @Post(":id/dropship")
  dropship(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: DropshipDto,
    @Req() req: Request,
  ) {
    return this.admin.recordDropship(id, user.id, dto, ipOf(req));
  }

  /** multipart/form-data: trackingNumber (field) + label (optional PDF file). */
  @Post(":id/tracking")
  @UseInterceptors(FileInterceptor("label", { limits: { fileSize: 20 * 1024 * 1024 } }))
  async tracking(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() body: { trackingNumber?: string },
    @UploadedFile() label?: Express.Multer.File,
    @Req() req?: Request,
  ) {
    if (!body?.trackingNumber || body.trackingNumber.trim().length < 6) {
      throw new BadRequestException({ code: "TRACKING_REQUIRED", message: "A tracking number is required." });
    }
    await this.admin.attachTracking(
      id,
      user.id,
      { trackingNumber: body.trackingNumber.trim() },
      label ? { originalname: label.originalname, buffer: label.buffer, size: label.size } : undefined,
      req ? ipOf(req) : undefined,
    );
    return this.admin.detail(id);
  }

  @Post(":id/status")
  transition(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: StatusTransitionDto,
    @Req() req: Request,
  ) {
    return this.admin
      .transitionTo(id, dto.status as never, user.id, dto.reason, ipOf(req))
      .then(() => this.admin.detail(id));
  }
}

function ipOf(req: Request): string | undefined {
  return (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip;
}
