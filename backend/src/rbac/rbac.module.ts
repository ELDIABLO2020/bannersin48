import { Global, Module } from "@nestjs/common";
import { RbacService } from "./rbac.service";
import { RbacAdminController } from "./rbac-admin.controller";

/**
 * Global so the APP_GUARDs in AppModule (JwtAuthGuard resolves permissions) and
 * every feature module can inject RbacService without re-importing it. Also
 * hosts the roles / permissions / overrides admin API (plan §5.2).
 */
@Global()
@Module({
  controllers: [RbacAdminController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
