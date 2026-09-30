import { Module } from "@nestjs/common";
import { JwtModule, type JwtModuleOptions } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { NotificationsModule } from "../notifications/notifications.module";
import { DEFAULT_JWT_AUDIENCE, DEFAULT_JWT_ISSUER } from "../config/env.validation";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

export const ACCESS_TOKEN_TTL = "15m";

/** HS256 only, with issuer and audience pinned on both sign and verify. */
export function jwtOptions(secret: string, issuer = DEFAULT_JWT_ISSUER, audience = DEFAULT_JWT_AUDIENCE): JwtModuleOptions {
  return {
    secret,
    signOptions: { algorithm: "HS256", expiresIn: ACCESS_TOKEN_TTL, issuer, audience },
    verifyOptions: { algorithms: ["HS256"], issuer, audience },
  };
}

@Module({
  imports: [
    NotificationsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        jwtOptions(
          config.getOrThrow<string>("JWT_SECRET"),
          config.get<string>("JWT_ISSUER"),
          config.get<string>("JWT_AUDIENCE"),
        ),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
