import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

/**
 * Role gate for internal routes. Use AFTER JwtAuthGuard so request.user exists:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles("STAFF", "ADMIN")
 *
 * ADMIN passes every guarded route; otherwise the user's role must be listed.
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
    if (user.role === "ADMIN" || required.includes(user.role)) {
      return true;
    }
    throw new ForbiddenException({
      code: "FORBIDDEN_ROLE",
      message: "Your role does not have access to this resource.",
    });
  }
}
