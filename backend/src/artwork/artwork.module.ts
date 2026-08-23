import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ArtworkController } from "./artwork.controller";
import { ArtworkService } from "./artwork.service";

@Module({
  imports: [AuthModule], // exports JwtModule for the route guards
  controllers: [ArtworkController],
  providers: [ArtworkService],
  exports: [ArtworkService],
})
export class ArtworkModule {}
