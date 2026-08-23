import { Module } from "@nestjs/common";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";
import { DeliveryModule } from "../delivery/delivery.module";
import { CatalogModule } from "../catalog/catalog.module";

@Module({
  imports: [CatalogModule, DeliveryModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
