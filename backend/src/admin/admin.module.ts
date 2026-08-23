import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrdersModule } from "../orders/orders.module";
import { ArtworkModule } from "../artwork/artwork.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdminOrdersController } from "./admin-orders.controller";
import { AdminOrdersService } from "./admin-orders.service";
import { PricingAdminController } from "./pricing-admin.controller";
import { PricingAdminService } from "./pricing-admin.service";

@Module({
  imports: [AuthModule, OrdersModule, ArtworkModule, NotificationsModule],
  controllers: [AdminOrdersController, PricingAdminController],
  providers: [AdminOrdersService, PricingAdminService],
})
export class AdminModule {}
