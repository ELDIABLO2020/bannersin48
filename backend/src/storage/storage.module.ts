import { Global, Module } from "@nestjs/common";
import { StorageService } from "./storage.service";
import { UploadLimiter } from "./upload-slots";

@Global()
@Module({
  providers: [StorageService, UploadLimiter],
  exports: [StorageService, UploadLimiter],
})
export class StorageModule {}
