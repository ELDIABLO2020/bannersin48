import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CatalogModule } from "./catalog/catalog.module";
import { PricingModule } from "./pricing/pricing.module";
import { ArtworkModule } from "./artwork/artwork.module";
import { OrdersModule } from "./orders/orders.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    PricingModule,
    ArtworkModule,
    OrdersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
