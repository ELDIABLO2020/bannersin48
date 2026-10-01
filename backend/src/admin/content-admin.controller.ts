import { Body, Controller, Delete, Get, Param, Put } from "@nestjs/common";
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientIp } from "../common/client-ip.decorator";
import { Public } from "../common/public.decorator";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { RequirePermissions } from "../rbac/require-permissions.decorator";
import { assertCan, type PermissionKey } from "../rbac/permissions";
import { ContentService, AdminContentService } from "./content-admin.service";

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

/** Editing a block's content is `content:edit`; touching `published` is `content:publish`. */
export function permissionsForContentUpsert(dto: Pick<UpsertContentDto, "published">): PermissionKey[] {
  return dto.published === undefined ? ["content:edit"] : ["content:edit", "content:publish"];
}

/**
 * CMS content (`content:*`). Mutations audited. Public reads live on /content
 * (no auth).
 */
@Controller("admin/content")
export class AdminContentController {
  constructor(private readonly content: AdminContentService) {}

  @RequirePermissions("content:read")
  @Get()
  listContent() {
    return this.content.listAll();
  }

  @RequirePermissions("content:read")
  @Get(":key")
  getContent(@Param("key") key: string) {
    return this.content.get(key);
  }

  @RequirePermissions("content:edit")
  @Put(":key")
  upsertContent(@CurrentUser() user: AuthedUser, @Param("key") key: string, @Body() dto: UpsertContentDto, @ClientIp() ip?: string) {
    assertCan(user, permissionsForContentUpsert(dto));
    return this.content.upsert(user.id, { ...dto, key }, ip);
  }

  @RequirePermissions("content:publish")
  @Delete(":key")
  deleteContent(@CurrentUser() user: AuthedUser, @Param("key") key: string, @ClientIp() ip?: string) {
    return this.content.delete(user.id, key, ip);
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
