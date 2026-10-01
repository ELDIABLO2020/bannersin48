import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { can, type PermissionKey } from "./permissions";
import { REQUIRE_ALL_PERMISSIONS_KEY, REQUIRE_ANY_PERMISSION_KEY } from "./require-permissions.decorator";

export interface RequiredPermissions {
  all: PermissionKey[] | undefined;
  any: PermissionKey[] | undefined;
}

/**
 * Metadata lookup shared by the guard and the coverage spec: a handler that
 * declares either decorator replaces the controller's declaration entirely,
 * so `@RequireAnyPermission` on a handler never silently inherits a class-level
 * `@RequirePermissions`.
 */
export function requiredPermissions(reflector: Reflector, handler: object, controller: object): RequiredPermissions {
  const read = (target: object) => ({
    all: reflector.get<PermissionKey[] | undefined>(REQUIRE_ALL_PERMISSIONS_KEY, target as never),
    any: reflector.get<PermissionKey[] | undefined>(REQUIRE_ANY_PERMISSION_KEY, target as never),
  });
  const own = read(handler);
  return own.all || own.any ? own : read(controller);
}

/**
 * Permission gate, registered globally after RolesGuard so request.user (with
 * its resolved permissions) exists. A route with no @RequirePermissions /
 * @RequireAnyPermission metadata passes — customer routes stay ownership-scoped
 * in their services — and permissions-coverage.spec.ts guarantees every
 * /admin/* route carries metadata, which makes deny-by-default structural.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const { all, any } = requiredPermissions(this.reflector, context.getHandler(), context.getClass());
    if ((!all || all.length === 0) && (!any || any.length === 0)) return true;

    const user: AuthedUser | undefined = context.switchToHttp().getRequest().user;
    if (!user) {
      throw new UnauthorizedException("Authentication required.");
    }

    const missing = (all ?? []).filter((key) => !can(user, key));
    const anySatisfied = !any || any.length === 0 || any.some((key) => can(user, key));
    if (missing.length === 0 && anySatisfied) return true;

    throw new ForbiddenException({
      code: "FORBIDDEN_PERMISSION",
      message: "You do not have permission to do this.",
      required: missing.length > 0 ? missing : (any ?? []),
    });
  }
}
