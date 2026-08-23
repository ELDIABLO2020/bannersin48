import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { PricingAdminService } from "./pricing-admin.service";
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  UpdateProductDto,
  UpsertFinishingOptionDto,
  UpsertVolumeTierDto,
} from "./pricing-admin.dto";

/**
 * Pricing control (§3c) — ADMIN only, every change audited.
 * Effective immediately for new quotes/orders; existing orders keep snapshots.
 */
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class PricingAdminController {
  constructor(private readonly pricing: PricingAdminService) {}

  // --- Products & materials ---
  @Get("products")
  listProducts() {
    return this.pricing.listProducts();
  }

  @Patch("products/:id")
  updateProduct(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: Request,
  ) {
    return this.pricing.updateProduct(user.id, id, dto, ipOf(req));
  }

  @Post("products/:id/materials")
  createMaterial(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: CreateMaterialDto,
    @Req() req: Request,
  ) {
    return this.pricing.createMaterial(user.id, id, dto, ipOf(req));
  }

  @Patch("products/:id/materials/:materialId")
  updateMaterial(
    @CurrentUser() user: AuthedUser,
    @Param("materialId") materialId: string,
    @Body() dto: UpdateMaterialDto,
    @Req() req: Request,
  ) {
    return this.pricing.updateMaterial(user.id, materialId, dto, ipOf(req));
  }

  @Delete("products/:id/materials/:materialId")
  deleteMaterial(
    @CurrentUser() user: AuthedUser,
    @Param("materialId") materialId: string,
    @Req() req: Request,
  ) {
    return this.pricing.deleteMaterial(user.id, materialId, ipOf(req));
  }

  // --- Finishing options ---
  @Get("finishing-options")
  listFinishingOptions() {
    return this.pricing.listFinishingOptions();
  }

  @Post("finishing-options")
  createFinishingOption(
    @CurrentUser() user: AuthedUser,
    @Body() dto: UpsertFinishingOptionDto & { code?: string },
    @Req() req: Request,
  ) {
    if (!dto.code) {
      return Promise.reject(
        Object.assign(new Error("code is required when creating."), { status: 400 }),
      );
    }
    return this.pricing.createFinishingOption(
      user.id,
      { code: dto.code, name: dto.name!, priceModel: dto.priceModel!, amount: dto.amount!, products: dto.products },
      ipOf(req),
    );
  }

  @Patch("finishing-options/:id")
  updateFinishingOption(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: UpsertFinishingOptionDto,
    @Req() req: Request,
  ) {
    return this.pricing.updateFinishingOption(user.id, id, dto, ipOf(req));
  }

  // --- Volume tiers ---
  @Get("volume-tiers")
  listVolumeTiers() {
    return this.pricing.listVolumeTiers();
  }

  @Post("volume-tiers")
  createVolumeTier(
    @CurrentUser() user: AuthedUser,
    @Body() dto: UpsertVolumeTierDto,
    @Req() req: Request,
  ) {
    return this.pricing.upsertVolumeTier(user.id, undefined, dto, ipOf(req));
  }

  @Put("volume-tiers/:id")
  updateVolumeTier(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Body() dto: UpsertVolumeTierDto,
    @Req() req: Request,
  ) {
    return this.pricing.upsertVolumeTier(user.id, id, dto, ipOf(req));
  }

  @Delete("volume-tiers/:id")
  deleteVolumeTier(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.pricing.deleteVolumeTier(user.id, id, ipOf(req));
  }
}

function ipOf(req: Request): string | undefined {
  return (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip;
}
