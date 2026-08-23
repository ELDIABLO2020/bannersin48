import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Product } from "@prisma/client";

export interface CatalogListItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  hasMoreInfo: boolean;
  route: string;
}

export interface CatalogProductDetail extends CatalogListItem {
  commonUses: string[];
  environment: string[];
  options: string[];
}

interface ProductDisplayConfig {
  title?: string;
  subtitle?: string;
  hasMoreInfo?: boolean;
  inHub?: boolean;
  hubCopy?: { commonUses?: string[]; environment?: string[]; options?: string[] };
}

/**
 * DB-driven catalog reads. The display shape mirrors the MSW handlers exactly —
 * do not change field names without updating the frontend contract.
 */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listBannerProducts(): Promise<CatalogListItem[]> {
    const products = await this.prisma.product.findMany({
      where: { active: true },
      orderBy: { sort: "asc" },
    });
    // The banner-hub grid only shows hub products (e.g. not the Retractable stand).
    return products
      .filter((p) => this.displayConfig(p).inHub !== false)
      .map((p) => this.toListItem(p));
  }

  async getBannerProduct(slug: string): Promise<CatalogProductDetail> {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product || !product.active || !this.displayConfig(product).hasMoreInfo) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Product not found." });
    }
    const copy = this.displayConfig(product).hubCopy ?? {};
    return {
      ...this.toListItem(product),
      commonUses: copy.commonUses ?? [],
      environment: copy.environment ?? [],
      options: copy.options ?? [],
    };
  }

  /** Load a product with its materials — used by the pricing module. */
  async getProductWithMaterials(codeOrSlug: string) {
    return this.prisma.product.findFirst({
      where: { OR: [{ code: codeOrSlug }, { slug: codeOrSlug }] },
      include: { materials: { where: { active: true }, orderBy: { sort: "asc" } } },
    });
  }

  private toListItem(product: Product): CatalogListItem {
    const config = this.displayConfig(product);
    return {
      id: product.code,
      slug: product.slug,
      title: config.title ?? product.name,
      subtitle: config.subtitle ?? "",
      hasMoreInfo: config.hasMoreInfo ?? false,
      route: `/order/${product.slug}`,
    };
  }

  private displayConfig(product: Product): ProductDisplayConfig {
    return (product.displayConfig as ProductDisplayConfig | null) ?? {};
  }
}
