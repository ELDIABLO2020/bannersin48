import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

/**
 * Coarse role-kind gate, registered globally after JwtAuthGuard so request.user exists:
 *   @Roles("STAFF", "ADMIN")
 *
 * Kept for optional coarse gating of future non-admin routes. Nothing under
 * `/admin/*` uses it any more (permissions-coverage.spec.ts refuses it there);
 * every admin route is gated by PermissionsGuard alone. There is no implicit
 * ADMIN bypass: the user's kind must be listed. An admin passes permission
 * checks because the `admin` role holds the wildcard, not because of its kind.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: { id: string; role: string } | undefined = request.user;
    if (!user) {
      throw new UnauthorizedException("Authentication required.");
    }
    if (required.includes(user.role)) {
      return true;
    }
    throw new ForbiddenException({
      code: "FORBIDDEN_ROLE",
      message: "Your role does not have access to this resource.",
    });
  }
}
