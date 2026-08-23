import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/** The user object attached to `request.user` after the guard passes. */
export interface AuthedUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Minimal Bearer-token guard (no passport dependency).
 * Verifies the access JWT and loads the user so suspended accounts are
 * rejected even with a still-valid token.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers["authorization"];
    // Query-param fallback so browser-native requests (<img src>) can pass the
    // same access token they would otherwise send as a header.
    const queryToken: unknown =
      typeof request.query?.access_token === "string" ? request.query.access_token : undefined;
    const rawToken = queryToken ? String(queryToken) : header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

    if (!rawToken) {
      throw new UnauthorizedException("Missing or malformed Authorization header.");
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync(rawToken);
    } catch {
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
