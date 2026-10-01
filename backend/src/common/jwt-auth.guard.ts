import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { RbacService, rbacUserInclude } from "../rbac/rbac.service";
import { roleKeyOf, type EffectivePermissions } from "../rbac/permissions";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { ALLOW_PASSWORD_CHANGE_REQUIRED_KEY } from "./password-change.decorator";

export interface JwtPayload {
  sub: string;
  /** Refresh-token row id of the session that minted this access token (absent on older tokens). */
  sid?: string;
}

/** The user object attached to `request.user` after the guard passes. */
export interface AuthedUser {
  id: string;
  email: string;
  /** Legacy coarse kind (CUSTOMER | STAFF | ADMIN | CONTENT_EDITOR), derived from the access role. */
  role: string;
  /** Access role key (`admin`, `staff`, `fulfillment`, …) or null before a role is assigned. */
  roleKey: string | null;
  /** Resolved on every request from the database: `"*"` for admin, otherwise the exact set. */
  permissions: EffectivePermissions;
  /** Staff created with a temporary password must replace it before doing anything else. */
  mustChangePassword: boolean;
  /**
   * The session (refresh-token row) this access token belongs to, so
   * `/users/me/sessions` can mark "this device" and "sign out other devices"
   * can keep it. Null for tokens minted before sessions carried an id; it
   * grants nothing (access is still resolved from the database).
   */
  sessionId: string | null;
}

/**
 * Global Bearer-token guard (registered as APP_GUARD; no passport dependency).
 * Routes are authenticated unless marked @Public(). It verifies the access JWT
 * (HS256, issuer and audience pinned in AuthModule) and loads the user — with
 * its role and overrides — so role, permission and status changes apply even
 * to a still-valid token. Nothing about access is read from the JWT.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
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

    const now = new Date();
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: rbacUserInclude(now) });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is not active.");
    }

    const mustChangePassword = Boolean(user.mustChangePassword);
    if (mustChangePassword) {
      const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_CHANGE_REQUIRED_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (!allowed) {
        throw new ForbiddenException({
          code: "PASSWORD_CHANGE_REQUIRED",
          message: "Set a new password before continuing.",
        });
      }
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      roleKey: roleKeyOf(user),
      permissions: this.rbac.resolveEffective(user, now),
      mustChangePassword,
      sessionId: typeof payload.sid === "string" && payload.sid.length > 0 ? payload.sid : null,
    } satisfies AuthedUser;
    return true;
  }
}
