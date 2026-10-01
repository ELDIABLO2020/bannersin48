import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { RbacService, rbacUserInclude } from "../rbac/rbac.service";
import { roleKeyOf } from "../rbac/permissions";
import type { AuthedUser, JwtPayload } from "./jwt-auth.guard";

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
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers["authorization"];

    if (header?.startsWith("Bearer ")) {
      try {
        const payload = await this.jwt.verifyAsync<JwtPayload>(header.slice("Bearer ".length));
        const now = new Date();
        const user =
          typeof payload.sub === "string"
            ? await this.prisma.user.findUnique({ where: { id: payload.sub }, include: rbacUserInclude(now) })
            : null;
        if (user && user.status === "ACTIVE") {
          request.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            roleKey: roleKeyOf(user),
            permissions: this.rbac.resolveEffective(user, now),
            mustChangePassword: Boolean(user.mustChangePassword),
            sessionId: typeof payload.sid === "string" && payload.sid.length > 0 ? payload.sid : null,
          } satisfies AuthedUser;
        }
      } catch {
        // Invalid token → treat as anonymous.
      }
    }
    return true;
  }
}
