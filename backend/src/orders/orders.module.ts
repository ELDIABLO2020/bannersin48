import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { ArtworkModule } from "../artwork/artwork.module";
import { CatalogModule } from "../catalog/catalog.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { PricingModule } from "../pricing/pricing.module";
import { AddressModule } from "../address/address.module";

@Module({
  imports: [AuthModule, ArtworkModule, CatalogModule, DeliveryModule, PricingModule, AddressModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
