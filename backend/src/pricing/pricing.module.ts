import { Module } from "@nestjs/common";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";
import { DeliveryService } from "../delivery/delivery.service";
import { CatalogModule } from "../catalog/catalog.module";

@Module({
  imports: [CatalogModule],
  controllers: [PricingController],
  providers: [PricingService, DeliveryService],
  exports: [PricingService],
})
export class PricingModule {}
