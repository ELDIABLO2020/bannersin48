import { Module } from "@nestjs/common";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";
import { PricingEngineService } from "./pricing-engine.service";
import { DeliveryModule } from "../delivery/delivery.module";
import { CatalogModule } from "../catalog/catalog.module";

@Module({
  imports: [CatalogModule, DeliveryModule],
  controllers: [PricingController],
  providers: [PricingService, PricingEngineService],
  exports: [PricingService, PricingEngineService],
})
export class PricingModule {}
