import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ArtworkModule } from "../artwork/artwork.module";
import { CatalogModule } from "../catalog/catalog.module";
import { PricingModule } from "../pricing/pricing.module";
import { DesignsController } from "./designs.controller";
import { DesignsService } from "./designs.service";

@Module({
  imports: [AuthModule, ArtworkModule, CatalogModule, PricingModule], // AuthModule exports JwtModule for the route guards
  controllers: [DesignsController],
  providers: [DesignsService],
})
export class DesignsModule {}
