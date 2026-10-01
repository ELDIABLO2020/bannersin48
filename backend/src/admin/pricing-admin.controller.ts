import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientIp } from "../common/client-ip.decorator";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { RequireAnyPermission, RequirePermissions } from "../rbac/require-permissions.decorator";
import { assertCan, type PermissionKey } from "../rbac/permissions";
import { PricingAdminService } from "./pricing-admin.service";
import {
  CreateFinishingOptionDto,
  CreateMaterialDto,
  CreateProductDto,
  UpdateMaterialDto,
  UpdateProductDto,
  UpsertFinishingOptionDto,
  UpsertVolumeTierDto,
} from "./pricing-admin.dto";

/** Money fields need `pricing:write`; everything else on a material or finishing option is `catalog:write`. */
const MATERIAL_PRICE_FIELDS: ReadonlyArray<keyof UpdateMaterialDto> = ["ratePerSqft", "flatPriceUsd", "doubleSideMultiplier"];
const FINISHING_PRICE_FIELDS: ReadonlyArray<keyof UpsertFinishingOptionDto> = ["amount", "priceModel"];

export function permissionsForPatch<T extends object>(dto: T, priceFields: ReadonlyArray<keyof T>): PermissionKey[] {
  const keys = Object.keys(dto) as Array<keyof T>;
  const touchesPrice = keys.some((k) => priceFields.includes(k) && dto[k] !== undefined);
  const touchesCatalog = keys.some((k) => !priceFields.includes(k) && dto[k] !== undefined);
  const needed: PermissionKey[] = [];
  if (touchesCatalog) needed.push("catalog:write");
  if (touchesPrice) needed.push("pricing:write");
  return needed.length > 0 ? needed : ["catalog:write"];
}

/**
 * Catalog & pricing control. `catalog:read` to view; `catalog:write` for
 * products, materials and finishing options; `pricing:write` for rates, flat
 * prices, multipliers and volume tiers. Patches that touch both need both.
 * Every change is audited and effective immediately for new quotes/orders;
 * existing orders keep snapshots. Permissions are the only gate (plan §6.2, phase 5).
 */
@Controller("admin")
@RequirePermissions("catalog:read")
export class PricingAdminController {
  constructor(private readonly pricing: PricingAdminService) {}

  // --- Products & materials ---
  @Get("products")
  listProducts() {
    return this.pricing.listProducts();
  }

  @RequirePermissions("catalog:write")
  @Post("products")
  createProduct(@CurrentUser() user: AuthedUser, @Body() dto: CreateProductDto, @ClientIp() ip?: string) {
    return this.pricing.createProduct(user.id, dto, ip);
  }

  @RequirePermissions("catalog:write")
  @Patch("products/:id")
  updateProduct(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.updateProduct(user.id, id, dto, ip);
  }

  @RequirePermissions("catalog:write")
  @Delete("products/:id")
  deleteProduct(@CurrentUser() user: AuthedUser, @Param("id") id: string, @ClientIp() ip?: string) {
    return this.pricing.deleteProduct(user.id, id, ip);
  }

  /** A new material carries its rate, so creating one is both a catalog and a pricing change. */
  @RequirePermissions("catalog:write", "pricing:write")
  @Post("products/:id/materials")
  createMaterial(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: CreateMaterialDto,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.createMaterial(user.id, id, dto, ip);
  }

  @RequireAnyPermission("catalog:write", "pricing:write")
  @Patch("products/:id/materials/:materialId")
  updateMaterial(
    @CurrentUser() user: AuthedUser,
    @Param("materialId") materialId: string,
    @Body() dto: UpdateMaterialDto,
    @ClientIp() ip?: string,
  ) {
    assertCan(user, permissionsForPatch(dto, MATERIAL_PRICE_FIELDS));
    return this.pricing.updateMaterial(user.id, materialId, dto, ip);
  }

  @RequirePermissions("catalog:write")
  @Delete("products/:id/materials/:materialId")
  deleteMaterial(
    @CurrentUser() user: AuthedUser,
    @Param("materialId") materialId: string,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.deleteMaterial(user.id, materialId, ip);
  }

  // --- Finishing options ---
  @Get("finishing-options")
  listFinishingOptions() {
    return this.pricing.listFinishingOptions();
  }

  @RequirePermissions("catalog:write", "pricing:write")
  @Post("finishing-options")
  createFinishingOption(
    @CurrentUser() user: AuthedUser,
    @Body() dto: CreateFinishingOptionDto,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.createFinishingOption(user.id, dto, ip);
  }

  @RequireAnyPermission("catalog:write", "pricing:write")
  @Patch("finishing-options/:id")
  updateFinishingOption(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: UpsertFinishingOptionDto,
    @ClientIp() ip?: string,
  ) {
    assertCan(user, permissionsForPatch(dto, FINISHING_PRICE_FIELDS));
    return this.pricing.updateFinishingOption(user.id, id, dto, ip);
  }

  @RequirePermissions("catalog:write")
  @Delete("finishing-options/:id")
  deleteFinishingOption(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.deleteFinishingOption(user.id, id, ip);
  }

  // --- Volume tiers ---
  @Get("volume-tiers")
  listVolumeTiers() {
    return this.pricing.listVolumeTiers();
  }

  @RequirePermissions("pricing:write")
  @Post("volume-tiers")
  createVolumeTier(
    @CurrentUser() user: AuthedUser,
    @Body() dto: UpsertVolumeTierDto,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.upsertVolumeTier(user.id, undefined, dto, ip);
  }

  @RequirePermissions("pricing:write")
  @Put("volume-tiers/:id")
  updateVolumeTier(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: UpsertVolumeTierDto,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.upsertVolumeTier(user.id, id, dto, ip);
  }

  @RequirePermissions("pricing:write")
  @Delete("volume-tiers/:id")
  deleteVolumeTier(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.deleteVolumeTier(user.id, id, ip);
  }
}
