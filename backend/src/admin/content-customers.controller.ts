import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { ContentService, AdminContentService } from "./content-admin.service";
import { AdminCustomersService } from "./customers-admin.service";

export class UpsertContentDto {
  @IsString() @MaxLength(80)
  key!: string;

  /** Required on create; one of BANNER_IMAGE | TEXT | ANNOUNCEMENT | PROMO_STRIP. */
  @IsOptional() @IsIn(["BANNER_IMAGE", "TEXT", "ANNOUNCEMENT", "PROMO_STRIP"])
  blockType?: string;

  @IsOptional() @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional() @IsBoolean()
  published?: boolean;
}

/**
 * §3d CMS content + §3e customer management. ADMIN only; mutations audited.
 * Public reads live on /content (no auth).
 */
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminContentCustomersController {
  constructor(
    private readonly content: AdminContentService,
    private readonly customers: AdminCustomersService,
  ) {}

  // --- CMS ---
  @Get("content")
  listContent() {
    return this.content.listAll();
  }

  @Get("content/:key")
  getContent(@Param("key") key: string) {
    return this.content.get(key);
  }

  @Put("content/:key")
  upsertContent(@CurrentUser() user: AuthedUser, @Param("key") key: string, @Body() dto: UpsertContentDto, @Req() req: Request) {
    return this.content.upsert(user.id, { ...dto, key }, ipOf(req));
  }

  @Delete("content/:key")
  deleteContent(@CurrentUser() user: AuthedUser, @Param("key") key: string, @Req() req: Request) {
    return this.content.delete(user.id, key, ipOf(req));
  }

  // --- Customers ---
  @Get("customers")
  searchCustomers(@Query("search") search?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.customers.search(search || undefined, page ? Number(page) : 1, pageSize ? Number(pageSize) : 25);
  }

  @Get("customers/:id")
  customerDetail(@Param("id") id: string) {
    return this.customers.detail(id);
  }

  @Post("customers/:id/reset-password")
  resetPassword(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Req() req: Request) {
    return this.customers.adminResetPassword(user.id, id, ipOf(req));
  }
}

/**
 * Public content reads (§3d): GET /content → all published blocks,
 * GET /content/:key → one published block.
 */
@Controller("content")
export class PublicContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  listPublished() {
    return this.content.listPublished();
  }

  @Get(":key")
  getPublished(@Param("key") key: string) {
    return this.content.getPublished(key);
  }
}

function ipOf(req: Request): string | undefined {
  return (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip;
}
