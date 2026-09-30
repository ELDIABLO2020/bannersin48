import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "./jwt-auth.guard";

/**
 * Like JwtAuthGuard, but never rejects: it attaches `request.user` when a
 * valid Bearer token for an active account is present, and lets the request
 * through otherwise. Used by endpoints that must respond differently to
 * anonymous callers (GET /auth/me returns JSON null instead of 401).
 * Pair it with @Public() so the global JwtAuthGuard lets the request through.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers["authorization"];

    if (header?.startsWith("Bearer ")) {
      try {
        const payload = await this.jwt.verifyAsync<JwtPayload>(header.slice("Bearer ".length));
        const user =
          typeof payload.sub === "string" ? await this.prisma.user.findUnique({ where: { id: payload.sub } }) : null;
        if (user && user.status === "ACTIVE") {
          request.user = { id: user.id, email: user.email, role: user.role };
        }
      } catch {
        // Invalid token → treat as anonymous.
      }
    }
    return true;
  }
}
