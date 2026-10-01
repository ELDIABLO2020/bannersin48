import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { validateEnv } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CatalogModule } from "./catalog/catalog.module";
import { PricingModule } from "./pricing/pricing.module";
import { ArtworkModule } from "./artwork/artwork.module";
import { OrdersModule } from "./orders/orders.module";
import { AddressModule } from "./address/address.module";
import { DesignsModule } from "./designs/designs.module";
import { AdminModule } from "./admin/admin.module";
import { HealthController } from "./health/health.controller";
import { JwtAuthGuard } from "./common/jwt-auth.guard";
import { RolesGuard } from "./common/roles.guard";
import { PermissionsGuard } from "./rbac/permissions.guard";
import { RbacModule } from "./rbac/rbac.module";
import { throttlerOptions } from "./common/throttling";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot(throttlerOptions()),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    AuditModule,
    RbacModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    PricingModule,
    ArtworkModule,
    AddressModule,
    OrdersModule,
    DesignsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  // Global guards run in this order: rate limit (cheap, before any DB work),
  // then authentication (skipped only for @Public()), then the coarse @Roles
  // kind check (unused under /admin; no ADMIN bypass), then @RequirePermissions,
  // which is the only gate on /admin/* (docs/accounts-admin-rbac-plan.md §6.2).
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
