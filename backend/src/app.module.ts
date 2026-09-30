import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
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
import { AdminModule } from "./admin/admin.module";
import { HealthController } from "./health/health.controller";
import { JwtAuthGuard } from "./common/jwt-auth.guard";
import { RolesGuard } from "./common/roles.guard";
import { throttlerOptions } from "./common/throttling";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot(throttlerOptions()),
    PrismaModule,
    StorageModule,
    AuditModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    PricingModule,
    ArtworkModule,
    AddressModule,
    OrdersModule,
    AdminModule,
  ],
  controllers: [HealthController],
  // Global guards run in this order: rate limit (cheap, before any DB work),
  // then authentication (skipped only for @Public()), then @Roles checks.
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
