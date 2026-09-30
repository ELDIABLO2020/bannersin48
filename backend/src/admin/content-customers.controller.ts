import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";
import { Roles } from "../common/roles.decorator";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientIp } from "../common/client-ip.decorator";
import { Public } from "../common/public.decorator";
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
 * CMS content (CONTENT_EDITOR + ADMIN) and customer management (STAFF + ADMIN).
 * Mutations audited.
 * Public reads live on /content (no auth).
 */
@Controller("admin")
@Roles("STAFF", "ADMIN", "CONTENT_EDITOR")
export class AdminContentCustomersController {
  constructor(
    private readonly content: AdminContentService,
    private readonly customers: AdminCustomersService,
  ) {}

  // --- CMS ---
  @Roles("CONTENT_EDITOR", "ADMIN")
  @Get("content")
  listContent() {
    return this.content.listAll();
  }

  @Roles("CONTENT_EDITOR", "ADMIN")
  @Get("content/:key")
  getContent(@Param("key") key: string) {
    return this.content.get(key);
  }

  @Roles("CONTENT_EDITOR", "ADMIN")
  @Put("content/:key")
  upsertContent(@CurrentUser() user: AuthedUser, @Param("key") key: string, @Body() dto: UpsertContentDto, @ClientIp() ip?: string) {
    return this.content.upsert(user.id, { ...dto, key }, ip);
  }

  @Roles("CONTENT_EDITOR", "ADMIN")
  @Delete("content/:key")
  deleteContent(@CurrentUser() user: AuthedUser, @Param("key") key: string, @ClientIp() ip?: string) {
    return this.content.delete(user.id, key, ip);
  }

  // --- Customers ---
  @Roles("STAFF", "ADMIN")
  @Get("customers")
  searchCustomers(@Query("search") search?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.customers.search(search || undefined, page ? Number(page) : 1, pageSize ? Number(pageSize) : 25);
  }

  @Roles("STAFF", "ADMIN")
  @Get("customers/:id")
  customerDetail(@Param("id") id: string) {
    return this.customers.detail(id);
  }

  @Roles("STAFF", "ADMIN")
  @Post("customers/:id/reset-password")
  resetPassword(@CurrentUser() user: AuthedUser, @Param("id") id: string, @ClientIp() ip?: string) {
    return this.customers.adminResetPassword(user, id, ip);
  }
}

/**
 * Public content reads: GET /content → all published blocks,
 * GET /content/:key → one published block.
 */
@Controller("content")
@Public()
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
