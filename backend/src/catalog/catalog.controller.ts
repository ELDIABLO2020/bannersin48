import { Controller, Get, Param } from "@nestjs/common";
import { CatalogService } from "./catalog.service";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("banner")
  listBannerProducts() {
    return this.catalog.listBannerProducts();
  }

  @Get("banner/:slug")
  getBannerProduct(@Param("slug") slug: string) {
    return this.catalog.getBannerProduct(slug);
  }
}
