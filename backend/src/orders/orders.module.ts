import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { ArtworkModule } from "../artwork/artwork.module";
import { CatalogModule } from "../catalog/catalog.module";
import { DeliveryModule } from "../delivery/delivery.module";

@Module({
  imports: [AuthModule, ArtworkModule, CatalogModule, DeliveryModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
