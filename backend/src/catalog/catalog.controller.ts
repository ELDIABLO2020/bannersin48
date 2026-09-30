import { Controller, Get, Param } from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { CatalogService } from "./catalog.service";

@Controller("catalog")
@Public()
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
