import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { Roles } from "../common/roles.decorator";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientIp } from "../common/client-ip.decorator";
import type { AuthedUser } from "../common/jwt-auth.guard";
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

/**
 * Pricing control — STAFF may read, only ADMIN may mutate; every change audited.
 * Effective immediately for new quotes/orders; existing orders keep snapshots.
 */
@Controller("admin")
@Roles("STAFF", "ADMIN")
export class PricingAdminController {
  constructor(private readonly pricing: PricingAdminService) {}

  // --- Products & materials ---
  @Get("products")
  listProducts() {
    return this.pricing.listProducts();
  }

  @Roles("ADMIN")
  @Post("products")
  createProduct(@CurrentUser() user: AuthedUser, @Body() dto: CreateProductDto, @ClientIp() ip?: string) {
    return this.pricing.createProduct(user.id, dto, ip);
  }

  @Roles("ADMIN")
  @Patch("products/:id")
  updateProduct(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.updateProduct(user.id, id, dto, ip);
  }

  @Roles("ADMIN")
  @Delete("products/:id")
  deleteProduct(@CurrentUser() user: AuthedUser, @Param("id") id: string, @ClientIp() ip?: string) {
    return this.pricing.deleteProduct(user.id, id, ip);
  }

  @Roles("ADMIN")
  @Post("products/:id/materials")
  createMaterial(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: CreateMaterialDto,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.createMaterial(user.id, id, dto, ip);
  }

  @Roles("ADMIN")
  @Patch("products/:id/materials/:materialId")
  updateMaterial(
    @CurrentUser() user: AuthedUser,
    @Param("materialId") materialId: string,
    @Body() dto: UpdateMaterialDto,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.updateMaterial(user.id, materialId, dto, ip);
  }

  @Roles("ADMIN")
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

  @Roles("ADMIN")
  @Post("finishing-options")
  createFinishingOption(
    @CurrentUser() user: AuthedUser,
    @Body() dto: CreateFinishingOptionDto,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.createFinishingOption(user.id, dto, ip);
  }

  @Roles("ADMIN")
  @Patch("finishing-options/:id")
  updateFinishingOption(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: UpsertFinishingOptionDto,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.updateFinishingOption(user.id, id, dto, ip);
  }

  @Roles("ADMIN")
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

  @Roles("ADMIN")
  @Post("volume-tiers")
  createVolumeTier(
    @CurrentUser() user: AuthedUser,
    @Body() dto: UpsertVolumeTierDto,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.upsertVolumeTier(user.id, undefined, dto, ip);
  }

  @Roles("ADMIN")
  @Put("volume-tiers/:id")
  updateVolumeTier(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: UpsertVolumeTierDto,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.upsertVolumeTier(user.id, id, dto, ip);
  }

  @Roles("ADMIN")
  @Delete("volume-tiers/:id")
  deleteVolumeTier(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @ClientIp() ip?: string,
  ) {
    return this.pricing.deleteVolumeTier(user.id, id, ip);
  }
}
