import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientIp } from "../common/client-ip.decorator";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { RequirePermissions } from "./require-permissions.decorator";
import { PERMISSIONS, isElevated, type PermissionKey } from "./permissions";
import { RbacService } from "./rbac.service";
import { CreateRoleDto, SetRolePermissionsDto, SetUserOverrideDto, UpdateRoleDto } from "./rbac-admin.dto";

/** Catalog entry as served by `GET /admin/permissions`: the code definition plus the `elevated` flag. */
export interface PermissionCatalogEntry {
  key: PermissionKey;
  resource: string;
  action: string;
  description: string;
  elevated: boolean;
}

/**
 * Roles, the permission catalog and per-user overrides (plan §5.2).
 * Reads need `rbac:read`; every mutation needs `rbac:manage` and goes through
 * RbacService, which applies the grant ceiling, immutability, self and
 * last-admin rules and audits inside the transaction.
 */
@Controller("admin")
export class RbacAdminController {
  constructor(private readonly rbac: RbacService) {}

  // --- Catalog ---

  @RequirePermissions("rbac:read")
  @Get("permissions")
  listPermissions(): PermissionCatalogEntry[] {
    return PERMISSIONS.map((p) => ({ key: p.key, resource: p.resource, action: p.action, description: p.description, elevated: isElevated(p.key) }));
  }

  // --- Roles ---

  @RequirePermissions("rbac:read")
  @Get("roles")
  listRoles() {
    return this.rbac.listRoles();
  }

  @RequirePermissions("rbac:read")
  @Get("roles/:id")
  getRole(@Param("id") id: string) {
    return this.rbac.getRole(id);
  }

  @RequirePermissions("rbac:manage")
  @Post("roles")
  createRole(@CurrentUser() user: AuthedUser, @Body() dto: CreateRoleDto, @ClientIp() ip?: string) {
    return this.rbac.createRole(user, dto, ip);
  }

  @RequirePermissions("rbac:manage")
  @Patch("roles/:id")
  updateRole(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: UpdateRoleDto, @ClientIp() ip?: string) {
    return this.rbac.updateRole(user, id, dto, ip);
  }

  /** Full replacement of the role's permission set; the response carries the stored list. */
  @RequirePermissions("rbac:manage")
  @Put("roles/:id/permissions")
  setRolePermissions(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() dto: SetRolePermissionsDto, @ClientIp() ip?: string) {
    return this.rbac.setRolePermissions(user, id, dto.permissions, ip);
  }

  @RequirePermissions("rbac:manage")
  @Delete("roles/:id")
  deleteRole(@CurrentUser() user: AuthedUser, @Param("id") id: string, @ClientIp() ip?: string) {
    return this.rbac.deleteRole(user, id, ip);
  }

  // --- Per-user overrides ---

  @RequirePermissions("rbac:read")
  @Get("users/:id/permissions")
  userPermissions(@Param("id") id: string) {
    return this.rbac.userPermissions(id);
  }

  @RequirePermissions("rbac:manage")
  @Put("users/:id/permissions/:key")
  setOverride(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Param("key") key: string,
    @Body() dto: SetUserOverrideDto,
    @ClientIp() ip?: string,
  ) {
    const permissionKey = assertCatalogKey(key);
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException({ code: "EXPIRY_IN_PAST", message: "Expiry must be in the future." });
    }
    return this.rbac.setOverride(user, id, { permissionKey, effect: dto.effect, reason: dto.reason ?? null, expiresAt }, ip);
  }

  @RequirePermissions("rbac:manage")
  @Delete("users/:id/permissions/:key")
  clearOverride(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Param("key") key: string, @ClientIp() ip?: string) {
    return this.rbac.clearOverride(user, id, assertCatalogKey(key), ip);
  }
}

/** Route params skip the DTO validator, so the catalog check happens here (plan §3.6 rule 8). */
export function assertCatalogKey(key: string): PermissionKey {
  const match = PERMISSIONS.find((p) => p.key === key);
  if (!match) throw new BadRequestException({ code: "UNKNOWN_PERMISSION", message: `Unknown permission "${key}".` });
  return match.key;
}
