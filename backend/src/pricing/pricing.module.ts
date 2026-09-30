import { Module } from "@nestjs/common";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";
import { PricingEngineService } from "./pricing-engine.service";
import { QuotePurgeService } from "./quote-purge.service";
import { AuthModule } from "../auth/auth.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { CatalogModule } from "../catalog/catalog.module";

@Module({
  imports: [AuthModule, CatalogModule, DeliveryModule], // AuthModule: JwtService for the optional-auth guard
  controllers: [PricingController],
  providers: [PricingService, PricingEngineService, QuotePurgeService],
  exports: [PricingService, PricingEngineService],
})
export class PricingModule {}
