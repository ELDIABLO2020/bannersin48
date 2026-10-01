import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrdersModule } from "../orders/orders.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ArtworkModule } from "../artwork/artwork.module";
import { streamingUploadsModule } from "../storage/upload-slots";
import { AdminDashboardController, AdminOrdersController } from "./admin-orders.controller";
import { AdminOrdersService } from "./admin-orders.service";
import { PricingAdminController } from "./pricing-admin.controller";
import { PricingAdminService } from "./pricing-admin.service";
import { AdminContentController, PublicContentController } from "./content-admin.controller";
import { AdminContentService, ContentService } from "./content-admin.service";
import { AdminCustomersController } from "./customers-admin.controller";
import { AdminCustomersService } from "./customers-admin.service";
import { RewardsAdminService } from "./rewards-admin.service";
import { PromosAdminController } from "./promos-admin.controller";
import { PromosAdminService } from "./promos-admin.service";
import { StaffAdminController } from "./staff-admin.controller";
import { StaffAdminService } from "./staff-admin.service";
import { AuditAdminController } from "./audit-admin.controller";
import { AuditAdminService } from "./audit-admin.service";

@Module({
  imports: [AuthModule, OrdersModule, NotificationsModule, ArtworkModule, streamingUploadsModule()],
  controllers: [
    AdminDashboardController,
    AdminOrdersController,
    PricingAdminController,
    AdminContentController,
    PublicContentController,
    AdminCustomersController,
    PromosAdminController,
    StaffAdminController,
    AuditAdminController,
  ],
  providers: [
    AdminOrdersService,
    PricingAdminService,
    AdminContentService,
    ContentService,
    AdminCustomersService,
    RewardsAdminService,
    PromosAdminService,
    StaffAdminService,
    AuditAdminService,
  ],
})
export class AdminModule {}
