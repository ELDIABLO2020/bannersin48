import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { UpdateMaterialDto, UpsertFinishingOptionDto, UpsertVolumeTierDto, UpdateProductDto } from "./pricing-admin.dto";

/**
 * Pricing control (§3c). ADMIN only. Every mutation is audited (old→new).
 * Rows referenced by existing orders are deactivated, never hard-deleted.
 */
@Injectable()
export class PricingAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // --- Products ---------------------------------------------------------------

  listProducts() {
    return this.prisma.product.findMany({
      orderBy: { sort: "asc" },
      include: { materials: { orderBy: { sort: "asc" } } },
    });
  }

  async updateProduct(actorId: string, id: string, dto: UpdateProductDto, ip?: string) {
    const before = await this.prisma.product.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: "NOT_FOUND", message: "Product not found." });
    const after = await this.prisma.product.update({ where: { id }, data: { ...dto, displayConfig: undefined, ...(dto.displayConfig ? { displayConfig: dto.displayConfig as object } : {}) } });
    await this.audit.record({
      actorId,
      action: "product.update",
      entityType: "product",
      entityId: id,
      diff: AuditService.diffOf(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>),
      ip,
    });
    return after;
  }

  // --- Materials ----------------------------------------------------------------

  async createMaterial(actorId: string, productId: string, dto: { code: string; name: string; ratePerSqft: number; flatPriceUsd?: number; doubleSideMultiplier?: number }, ip?: string) {
    await this.assertProduct(productId);
    const dupe = await this.prisma.productMaterial.findUnique({
      where: { productId_code: { productId, code: dto.code } },
    });
    if (dupe) throw new ConflictException({ code: "DUPLICATE", message: `Material ${dto.code} already exists on this product.` });
    const row = await this.prisma.productMaterial.create({
      data: {
        productId,
        code: dto.code,
        name: dto.name,
        ratePerSqft: dto.ratePerSqft.toFixed(2),
        flatPriceUsd: dto.flatPriceUsd != null ? dto.flatPriceUsd.toFixed(2) : null,
        doubleSideMultiplier: (dto.doubleSideMultiplier ?? 1).toFixed(2),
      },
    });
    await this.audit.record({
      actorId,
      action: "product_material.create",
      entityType: "product_material",
      entityId: row.id,
      diff: { after: row },
      ip,
    });
    return row;
  }

  async updateMaterial(actorId: string, materialId: string, dto: UpdateMaterialDto, ip?: string) {
    const before = await this.prisma.productMaterial.findUnique({ where: { id: materialId } });
    if (!before) throw new NotFoundException({ code: "NOT_FOUND", message: "Material not found." });
    const after = await this.prisma.productMaterial.update({
      where: { id: materialId },
      data: {
        ...(dto.name != null ? { name: dto.name } : {}),
        ...(dto.ratePerSqft != null ? { ratePerSqft: dto.ratePerSqft.toFixed(2) } : {}),
        ...(dto.flatPriceUsd != null ? { flatPriceUsd: dto.flatPriceUsd.toFixed(2) } : {}),
        ...(dto.doubleSideMultiplier != null ? { doubleSideMultiplier: dto.doubleSideMultiplier.toFixed(2) } : {}),
        ...(dto.active != null ? { active: dto.active } : {}),
      },
    });
    await this.audit.record({
      actorId,
      action: "product_material.update",
      entityType: "product_material",
      entityId: materialId,
      diff: AuditService.diffOf(
        before as unknown as Record<string, unknown>,
        after as unknown as Record<string, unknown>,
      ),
      ip,
    });
    return after;
  }

  /** Hard-deletes only when no orders reference it; otherwise deactivate. */
  async deleteMaterial(actorId: string, materialId: string, ip?: string): Promise<{ deleted: boolean }> {
    const before = await this.prisma.productMaterial.findUnique({ where: { id: materialId } });
    if (!before) throw new NotFoundException({ code: "NOT_FOUND", message: "Material not found." });
    const used = await this.prisma.orderItem.count({ where: { materialCode: before.code } });
    if (used > 0) {
      throw new ConflictException({
        code: "IN_USE",
        message: `${used} order line(s) reference this material — deactivate it instead.`,
      });
    }
    await this.prisma.productMaterial.delete({ where: { id: materialId } });
    await this.audit.record({
      actorId,
      action: "product_material.delete",
      entityType: "product_material",
      entityId: materialId,
      diff: { removed: before },
      ip,
    });
    return { deleted: true };
  }

  // --- Finishing options ---------------------------------------------------------

  listFinishingOptions() {
    return this.prisma.finishingOption.findMany({ orderBy: { sort: "asc" } });
  }

  async createFinishingOption(actorId: string, dto: Required<Pick<UpsertFinishingOptionDto, "name" | "priceModel" | "amount">> & { code: string; products?: string[] }, ip?: string) {
    const dupe = await this.prisma.finishingOption.findUnique({ where: { code: dto.code } });
    if (dupe) throw new ConflictException({ code: "DUPLICATE", message: `Finishing option ${dto.code} already exists.` });
    const validModels = ["FREE", "PER_SQFT", "PER_FT", "PER_EDGE", "FLAT"];
    if (!validModels.includes(dto.priceModel)) {
      throw new BadRequestException({ code: "BAD_PRICE_MODEL", message: `priceModel must be one of ${validModels.join(", ")}.` });
    }
    const row = await this.prisma.finishingOption.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { code: dto.code, name: dto.name, products: (dto.products ?? []) as any, priceModel: dto.priceModel as never, amount: dto.amount.toFixed(2) },
    });
    await this.audit.record({
      actorId,
      action: "finishing_option.create",
      entityType: "finishing_option",
      entityId: row.id,
      diff: { after: row },
      ip,
    });
    return row;
  }

  async updateFinishingOption(actorId: string, id: string, dto: UpsertFinishingOptionDto, ip?: string) {
    const before = await this.prisma.finishingOption.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: "NOT_FOUND", message: "Finishing option not found." });
    const after = await this.prisma.finishingOption.update({
      where: { id },
      data: {
        ...(dto.name != null ? { name: dto.name } : {}),
        ...(dto.products != null ? { products: dto.products as never } : {}),
        ...(dto.priceModel != null ? { priceModel: dto.priceModel as never } : {}),
        ...(dto.amount != null ? { amount: dto.amount.toFixed(2) } : {}),
        ...(dto.active != null ? { active: dto.active } : {}),
      },
    });
    await this.audit.record({
      actorId,
      action: "finishing_option.update",
      entityType: "finishing_option",
      entityId: id,
      diff: AuditService.diffOf(
        before as unknown as Record<string, unknown>,
        after as unknown as Record<string, unknown>,
      ),
      ip,
    });
    return after;
  }

  // --- Volume tiers ------------------------------------------------------------

  listVolumeTiers() {
    return this.prisma.volumeTier.findMany({ orderBy: { minBillableSqft: "asc" } });
  }

  async upsertVolumeTier(actorId: string, id: string | undefined, dto: UpsertVolumeTierDto, ip?: string) {
    if (id) {
      const before = await this.prisma.volumeTier.findUnique({ where: { id } });
      if (!before) throw new NotFoundException({ code: "NOT_FOUND", message: "Volume tier not found." });
      const after = await this.prisma.volumeTier.update({
        where: { id },
        data: {
          minBillableSqft: dto.minBillableSqft.toFixed(2),
          rates: dto.rates as object,
          warningCopy: dto.warningCopy ?? null,
          ...(dto.productId !== undefined ? { productId: dto.productId || null } : {}),
          ...(dto.materialCode !== undefined ? { materialCode: dto.materialCode || null } : {}),
        },
      });
      await this.audit.record({
        actorId,
        action: "volume_tier.update",
        entityType: "volume_tier",
        entityId: id,
        diff: {
          ...AuditService.diffOf(
            before as unknown as Record<string, unknown>,
            after as unknown as Record<string, unknown>,
          ),
        },
        ip,
      });
      return after;
    }
    const row = await this.prisma.volumeTier.create({
      data: {
        productId: dto.productId || null,
        materialCode: dto.materialCode || null,
        minBillableSqft: dto.minBillableSqft.toFixed(2),
        rates: dto.rates as object,
        warningCopy: dto.warningCopy ?? null,
      },
    });
    await this.audit.record({
      actorId,
      action: "volume_tier.create",
      entityType: "volume_tier",
      entityId: row.id,
      diff: { after: row },
      ip,
    });
    return row;
  }

  async deleteVolumeTier(actorId: string, id: string, ip?: string): Promise<{ deleted: boolean }> {
    const before = await this.prisma.volumeTier.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: "NOT_FOUND", message: "Volume tier not found." });
    await this.prisma.volumeTier.delete({ where: { id } }); // orders snapshot prices; tiers are safe to delete
    await this.audit.record({
      actorId,
      action: "volume_tier.delete",
      entityType: "volume_tier",
      entityId: id,
      diff: { removed: before },
      ip,
    });
    return { deleted: true };
  }

  private async assertProduct(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException({ code: "NOT_FOUND", message: "Product not found." });
    return product;
  }
}
