import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "./public.decorator";

export interface JwtPayload {
  sub: string;
}

/** The user object attached to `request.user` after the guard passes. */
export interface AuthedUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Global Bearer-token guard (registered as APP_GUARD; no passport dependency).
 * Routes are authenticated unless marked @Public(). It verifies the access JWT
 * (HS256, issuer and audience pinned in AuthModule) and loads the user so role
 * changes and suspensions apply even to a still-valid token.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    // Header only. Tokens never travel in URLs (logs, history, Referer); file links
    // for <img> and downloads are HMAC-signed instead (DownloadUrlService).
    const header: string | undefined = request.headers["authorization"];
    const rawToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

    if (!rawToken) {
      throw new UnauthorizedException("Missing or malformed Authorization header.");
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(rawToken);
    } catch {
      throw new UnauthorizedException("Invalid or expired token.");
    }
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new UnauthorizedException("Invalid or expired token.");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is not active.");
    }

    request.user = { id: user.id, email: user.email, role: user.role } satisfies AuthedUser;
    return true;
  }
}
