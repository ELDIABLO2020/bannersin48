import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { streamingUploadsModule } from "../storage/upload-slots";
import { ArtworkController } from "./artwork.controller";
import { ArtworkService } from "./artwork.service";
import { DownloadUrlService } from "./download-url.service";

@Module({
  imports: [AuthModule, streamingUploadsModule()], // AuthModule exports JwtModule for the route guards
  controllers: [ArtworkController],
  providers: [ArtworkService, DownloadUrlService],
  exports: [ArtworkService, DownloadUrlService],
})
export class ArtworkModule {}
